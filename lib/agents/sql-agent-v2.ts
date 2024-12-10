import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import PocketBase from 'pocketbase';
import { v4 as uuidv4 } from 'uuid';

// Initialize PocketBase client
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
pb.autoCancellation(false);
let currentConversationId = '';

// Create initial greeting message
async function createGreetingMessage(user: string) {
  try {
    currentConversationId = uuidv4();
    await saveMessage({
      user: user,
      role: 'assistant',
      content: 'Hello! How can I assist you today?',
      conversation_id: currentConversationId
    });
  } catch (error) {
    console.error('Failed to create greeting message:', error);
  }
}

// Basic authentication
async function initPocketBase() {
  try {
    if (!pb.authStore.isValid) {
      await pb.admins.authWithPassword(
        process.env.POCKETBASE_ADMIN_EMAIL!,
        process.env.POCKETBASE_ADMIN_PASSWORD!
      );
      console.log('Authenticated as admin');
    }
  } catch (error) {
    console.error('Failed to authenticate:', error);
    throw new Error('Failed to authenticate with PocketBase');
  }
}

// Initialize the LLM
const llm = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0,
});

// Create prompt template
const promptTemplate = new PromptTemplate({
  template: `You are a helpful assistant for querying PocketBase database.

Available collections and their fields:
- users (auth): id, email, name
- blacklist_entries: id, fullName, phoneNumber
- currency_options: id, code, name, symbol, isDefault
- delivery_options: id, name
- orders: id, orderNumber, source, deliveryMethod, deliveryPostNumber, phoneNumber, fullName, products, numberOfItems, amount, status, currency, paymentMethod, notes
- payment_options: id, name
- sources: id, name, url
- status_options: id, name, color, priority

Previous conversation:
{history}

Current user query: {input}

Based on the previous conversation and current query, respond ONLY with a JSON object containing:
- collection: the name of the collection to query
- filter: (optional) filter string in PocketBase format
- sort: (optional) sort string in PocketBase format ("-created" for newest first)
- limit: (optional) number of records to return (default is 50)

For follow-up questions about previous results, use the information from the chat history to construct the appropriate filter.`,
  inputVariables: ["input", "history"],
});

interface PocketBaseError {
  response?: {
    code: number;
    message: string;
    data: {
      [key: string]: any;
    };
  };
}

interface ChatMessage {
  id?: string;
  user: string;
  role: string;
  content: string;
  conversation_id: string;
}

// Get or create system user
async function getSystemUser() {
  try {
    const systemUser = await pb.collection('users').getFirstListItem('email="system@local"');
    return systemUser.id;
  } catch (e) {
    // Create system user if not exists
    const newUser = await pb.collection('users').create({
      email: 'system@local',
      password: crypto.randomUUID(),
      passwordConfirm: crypto.randomUUID(),
      name: 'System User',
      username: 'system'
    });
    return newUser.id;
  }
}

async function saveMessage(messageData: ChatMessage) {
  try {
    await initPocketBase();

    // Debug incoming data
    console.log('Incoming messageData:', JSON.stringify(messageData, null, 2));

    // Ensure we have a valid user ID
    let userId = messageData.user;
    console.log('User ID before validation:', userId, typeof userId);

    if (!userId || userId === 'undefined' || userId === 'null') {
      throw new Error('Valid user ID is required');
    }

    // Create record with exact PocketBase schema
    const data = {
      user: userId,  // This should be a valid record ID from the users collection
      role: messageData.role,
      content: messageData.content,
      conversation_id: messageData.conversation_id
    };

    // Debug outgoing request
    console.log('PocketBase request data:', JSON.stringify(data, null, 2));

    const messageRecord = await pb.collection('chat_messages').create(data);
    console.log('Response from PocketBase:', messageRecord);
    return messageRecord;
  } catch (error: any) {
    console.error('Save error details:', {
      error: error.message,
      response: error.response?.data,
      originalData: messageData,
      userId: messageData.user
    });
    return null;
  }
}

async function processQuery(query: string, history: any[] = [], user: string): Promise<SQLResponse> {
  try {
    await initPocketBase();
    
    // If no history, create greeting message first
    if (!history || history.length === 0) {
      await createGreetingMessage(user);
    }
    
    if (!currentConversationId) {
      currentConversationId = uuidv4();
    }

    console.log('Processing query with user ID:', user);

    // Save user message
    await saveMessage({
      user: user,
      role: 'user',
      content: query,
      conversation_id: currentConversationId
    });

    const formattedHistory = history.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');

    const prompt = await promptTemplate.format({ 
      input: query,
      history: formattedHistory
    });
    
    const response = await llm.invoke(prompt);
    let result = '';
    
    if (typeof response.content === 'string') {
      result = response.content;
    } else if (Array.isArray(response.content)) {
      const firstContent = response.content[0];
      if (typeof firstContent === 'string') {
        result = firstContent;
      } else if ('type' in firstContent && firstContent.type === 'text') {
        result = firstContent.text;
      }
    }

    // Save assistant response
    const assistantMessage = {
      user: user,         // User ID for relation
      role: 'assistant',  // Plain text
      content: result,    // Plain text
      conversation_id: currentConversationId  // Plain text
    };

    console.log('Saving assistant message:', JSON.stringify(assistantMessage, null, 2));
    await saveMessage(assistantMessage);

    if (!result) {
      throw new Error('Failed to get valid response from LLM');
    }
    
    return JSON.parse(result);
  } catch (error) {
    console.error('Query processing error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to process query',
      collection: null
    };
  }
}

async function executeQuery(queryParams: SQLResponse) {
  try {
    if (!queryParams.collection) {
      throw new Error('No collection specified');
    }

    const queryOptions: Record<string, any> = {
      expand: 'deliveryMethod,paymentMethod,status,currency'
    };

    if (queryParams.sort) {
      queryOptions.sort = queryParams.sort;
    }

    if (queryParams.filter && queryParams.filter !== 'undefined') {
      queryOptions.filter = queryParams.filter;
    }

    const result = await pb.collection(queryParams.collection).getList(
      1,
      queryParams.limit || 50,
      queryOptions
    );

    const formattedRecords = result.items.map(record => {
      if (queryParams.collection === 'orders') {
        return {
          orderNumber: record.orderNumber,
          amount: `${record.amount} ${record.expand?.currency?.symbol || '₴'}`,
          status: record.expand?.status?.name || record.status,
          customer: record.fullName,
          phone: record.phoneNumber,
          delivery: {
            method: record.expand?.deliveryMethod?.name || record.deliveryMethod,
            postNumber: record.deliveryPostNumber
          },
          payment: record.expand?.paymentMethod?.name || record.paymentMethod,
          source: record.source,
          products: record.products,
          created: new Date(record.created).toLocaleString()
        };
      }
      return record;
    });

    return {
      count: formattedRecords.length,
      total: result.totalItems,
      records: formattedRecords
    };
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
}

// Export the agent
export const sqlAgent = {
  processQuery,
  executeQuery,
  resetConversation: () => { 
    currentConversationId = ''; 
  }
};

// Types
interface SQLResponse {
  collection: string | null;
  filter?: string;
  sort?: string;
  limit?: number;
  error?: string;
} 