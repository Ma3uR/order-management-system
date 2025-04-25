import { createOrGetUserChat, saveChat } from '@/app/lib/chat-store';
import { NextResponse } from 'next/server';
import { Message } from 'ai';
import OpenAI from 'openai';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { OrdersResponse, StatusResponse, CurrencyResponse, DeliveryOptionsResponse, PaymentMethodsResponse } from '@/app/types/pocketbase-types';

// Get OpenAI API key from env var
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to verify user exists in database
async function verifyUserId(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      console.log('verifyUserId: userId is empty or null');
      return false;
    }    
    // First try direct lookup to see if user exists
    try {
      await authenticatedCall(() => pb.collection('users').getOne(userId));
      return true;
    } catch (error) {
      // If direct lookup fails, try to search for the user
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`verifyUserId: Direct lookup failed for "${userId}", trying list: ${errorMessage}`);
      
      const users = await authenticatedCall(() => pb.collection('users').getList(1, 1, {
        filter: `id = "${userId}"`
      }));
      
      if (users.totalItems > 0) {
        return true;
      }
      
      return false;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`verifyUserId: Error verifying user "${userId}":`, error.message);
    } else {
      console.error(`verifyUserId: Error verifying user "${userId}":`, String(error));
    }
    return false;
  }
}

/**
 * Get total count of orders in the system
 */
async function getOrdersCount() {
  try {
    console.log('Executing getOrdersCount...');
    const result = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 1, { sort: '-created' })
    );
    console.log('getOrdersCount result:', result.totalItems);
    return { count: result.totalItems };
  } catch (error) {
    console.error('Error getting orders count:', error);
    return { error: 'Failed to get orders count', details: String(error) };
  }
}

/**
 * Get the most recent order from the system with enhanced details
 */
async function getLastOrder() {
  try {
    console.log('Executing getLastOrder...');
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList<OrdersResponse<unknown, {
        status: StatusResponse,
        currency: CurrencyResponse,
        paymentMethod: PaymentMethodsResponse,
        deliveryMethod: DeliveryOptionsResponse
      }>>(1, 1, { 
        sort: '-created',
        expand: 'status,currency,paymentMethod,deliveryMethod',
        fields: 'id,created,orderNumber,fullName,phoneNumber,status,currency,paymentMethod,deliveryMethod,amount,products,numberOfItems,expand'
      })
    );
    
    if (orders.items.length === 0) {
      console.log('No orders found');
      return { message: 'No orders found' };
    }
    
    // Get the raw order data
    const order = orders.items[0];
    console.log('Last order found:', order.id);
    console.log('Order:', order);
    
    // Get expanded data
    const statusName = order.expand?.status?.name || 'Not specified';
    const currencyCode = order.expand?.currency?.code || 'Not specified';
    const currencySymbol = order.expand?.currency?.symbol || '';
    const paymentMethodName = order.expand?.paymentMethod?.name || 'Not specified';
    const deliveryMethodName = order.expand?.deliveryMethod?.name || 'Not specified';
    
    // Format customer information
    const customerInfo = order.fullName 
      ? `${order.fullName} (${order.phoneNumber})` 
      : 'Not available';
    
    // Format items information if available
    let itemsInfo: Array<{name: string, quantity: number, price: number}> = [];
    if (Array.isArray(order.products) && order.products.length > 0) {
      itemsInfo = order.products.map(item => ({
        name: item.name || 'Unnamed product',
        quantity: item.quantity || 1,
        price: item.price || 0
      }));
    }
    
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.created,
      statusName: statusName,
      customer: customerInfo,
      total: order.amount || 0,
      currencyCode: currencyCode,
      currencySymbol: currencySymbol,
      paymentMethod: paymentMethodName,
      deliveryMethod: deliveryMethodName,
      itemsCount: order.numberOfItems || 0,
      items: itemsInfo
    };
  } catch (error) {
    console.error('Error getting last order:', error);
    return { error: 'Failed to get last order', details: String(error) };
  }
}

/**
 * Get orders by customer phone number 
 */
async function getOrdersByPhone(phoneNumber: string) {
  try {
    console.log(`Executing getOrdersByPhone with number: ${phoneNumber}...`);
    
    if (!phoneNumber) {
      console.log('Phone number is missing');
      return { error: 'Phone number is required' };
    }
    
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 10, { 
        filter: `customer.phone ~ "${phoneNumber}"`,
        sort: '-created'
      })
    );
    
    console.log(`Found ${orders.totalItems} orders for phone ${phoneNumber}`);
    
    if (orders.totalItems === 0) {
      return { message: `No orders found for phone number ${phoneNumber}` };
    }
    
    // Return simplified versions of the orders
    return {
      count: orders.totalItems,
      orders: orders.items.map(order => ({
        id: order.id,
        createdAt: order.created,
        status: order.status,
        customer: order.customer,
        total: order.total
      }))
    };
  } catch (error) {
    console.error(`Error getting orders for phone ${phoneNumber}:`, error);
    return { error: 'Failed to get orders by phone', details: String(error) };
  }
}

// Define the available functions
const availableFunctions = [
  {
    name: 'getOrdersCount',
    description: 'Get the total count of orders in the system',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getLastOrder',
    description: 'Get the most recent order in the system',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getOrdersByPhone',
    description: 'Get orders for a specific customer by phone number',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Customer phone number to search for'
        }
      },
      required: ['phoneNumber']
    }
  }
];

// Execute a function based on the name and arguments
async function executeFunction(functionName: string, args: Record<string, unknown>) {
  console.log(`Executing function ${functionName} with args:`, args);
  
  switch (functionName) {
    case 'getOrdersCount':
      return await getOrdersCount();
    case 'getLastOrder':
      return await getLastOrder();
    case 'getOrdersByPhone':
      if (typeof args.phoneNumber === 'string') {
        return await getOrdersByPhone(args.phoneNumber);
      }
      return { error: 'Invalid phone number provided' };
    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

// This is the main chat route that handles chat requests
export async function POST(req: Request) {
  try {
    const { messages, id, userId, debug } = await req.json();
    
    // For debugging
    console.log(`Chat API called with id: ${id}, userId: "${userId}"`);
    
    // Log debug info if available
    if (debug) {
      console.log('Client debug info:', JSON.stringify(debug, null, 2));
    }
    
    console.log(`Processing ${messages.length} messages`);
    
    // Get or create a chat ID
    let chatId = id;
    
    // If we have a userId, verify it exists and get or create their chat
    if (userId) {
      console.log(`Attempting to validate user ID: "${userId}"`);
      // Verify the user exists before trying to create a chat for them
      const userExists = await verifyUserId(userId);
      
      if (!userExists) {
        console.error(`User ${userId} does not exist in the database`);
        const response = NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 }
        );
        // Add header to indicate auth error
        response.headers.set('X-Error-Type', 'auth');
        return response;
      }
      
      chatId = await createOrGetUserChat(userId);
      console.log(`Using chat ID ${chatId} for user ${userId}`);
    } else if (!chatId) {
      // If no userId and no chatId, we can't proceed properly
      console.warn('No userId or chatId provided - chat persistence may be limited');
    }
    
    try {
      console.log('Starting OpenAI streaming with function calling...');
      
      // Convert our messages to OpenAI format
      const openaiMessages = [
        {
          role: 'system',
          content: "You are a helpful AI assistant for an order management system. You can answer questions about orders, help analyze data, and provide general assistance with the system's features. You can count orders, get the most recent order, and find orders by customer phone number."
        },
        ...messages.map((m: Message) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        }))
      ];
      
      // Create a stream from OpenAI with function calling
      const stream = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
        tools: availableFunctions.map(func => ({
          type: 'function',
          function: func
        }))
      });
      
      // Set up proper headers for streaming
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let responseText = '';
          let functionCallName = '';
          let functionCallArguments = '';
          let functionCallId = '';  // Store the tool call ID
          let isCollectingFunctionCall = false;
          
          // Process each chunk from the OpenAI stream
          for await (const chunk of stream) {
            // Check if there's a function call
            const toolCall = chunk.choices[0]?.delta?.tool_calls?.[0];
            
            if (toolCall) {
              isCollectingFunctionCall = true;
              
              // Capture the tool call ID if present
              if (toolCall.id) {
                functionCallId = toolCall.id;
                console.log(`Function call ID: ${functionCallId}`);
              }
              
              // If this chunk contains the function name, record it
              if (toolCall.function?.name) {
                functionCallName = toolCall.function.name;
                console.log(`Function call detected: ${functionCallName}`);
              }
              
              // If this chunk contains function arguments, append them
              if (toolCall.function?.arguments) {
                functionCallArguments += toolCall.function.arguments;
              }
              
              // Don't output anything to the client during function call collection
              continue;
            }
            
            // If we were collecting a function call and now we're not, execute it
            if (isCollectingFunctionCall && !toolCall && functionCallName) {
              isCollectingFunctionCall = false;
              console.log(`Executing collected function: ${functionCallName} with args: ${functionCallArguments}`);
              
              try {
                // Parse the arguments
                const args = JSON.parse(functionCallArguments || '{}');
                
                // Execute the function
                const functionResult = await executeFunction(functionCallName, args);
                console.log('Function result:', functionResult);
                
                // DON'T show the raw function data to the user anymore
                // This is for server-side logging only
                const debugStr = `\n\nFetching data using ${functionCallName}...\n\n${JSON.stringify(functionResult, null, 2)}`;
                console.log(debugStr);
                
                // Only attempt follow-up if we have a valid function call ID
                if (functionCallId) {
                  try {
                    // Continue the conversation with the AI using the function result
                    await openai.chat.completions.create({
                      model: 'gpt-4-turbo',
                      messages: [
                        ...openaiMessages,
                        {
                          role: 'assistant',
                          content: null,
                          tool_calls: [{
                            id: functionCallId,
                            type: 'function',
                            function: {
                              name: functionCallName,
                              arguments: functionCallArguments
                            }
                          }]
                        },
                        {
                          role: 'tool',
                          tool_call_id: functionCallId,
                          content: JSON.stringify(functionResult),
                          name: functionCallName
                        }
                      ],
                      temperature: 0.7,
                      max_tokens: 1024
                    });
                    
                    // Return raw data instead of formatted message
                    const fallbackMsg = JSON.stringify(functionResult, null, 2);
                    
                    controller.enqueue(encoder.encode(fallbackMsg));
                    responseText += fallbackMsg;
                  } catch (followUpError) {
                    console.error('Error with follow-up response:', followUpError);
                    // Return raw data instead of formatted message
                    const fallbackMsg = JSON.stringify(functionResult, null, 2);
                    
                    controller.enqueue(encoder.encode(fallbackMsg));
                    responseText += fallbackMsg;
                  }
                } else {
                  // No function call ID available, provide raw data response
                  const simpleResponse = JSON.stringify(functionResult, null, 2);
                  controller.enqueue(encoder.encode(simpleResponse));
                  responseText += simpleResponse;
                }
                
                // Reset for potential next function call
                functionCallName = '';
                functionCallArguments = '';
                functionCallId = '';
              } catch (funcError) {
                console.error('Error executing function:', funcError);
                const errorMsg = `I encountered an issue retrieving that information. Please try again.`;
                controller.enqueue(encoder.encode(errorMsg));
                responseText += errorMsg;
              }
            } else {
              // Normal content handling
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
                responseText += content;
              }
            }
          }
          
          // Save the completed response to database
          if (chatId) {
            try {
              console.log('Saving response to database, length:', responseText.length);
              
              // Add the AI response to messages
              const updatedMessages = [...messages, {
                id: `ai-${Date.now()}`,
                role: 'assistant' as const,
                content: responseText,
                createdAt: new Date()
              }];
              
              await saveChat({
                id: chatId,
                userId,
                messages: updatedMessages
              });
              console.log(`Saved chat with ${updatedMessages.length} messages`);
            } catch (saveError) {
              console.error('Error saving chat:', saveError);
            }
          }
          
          // Close the stream
          controller.close();
        }
      });
      
      // Return the stream in the response
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      return NextResponse.json(
        { error: 'Failed to stream chat response', details: String(streamError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: String(error) },
      { status: 500 }
    );
  }
} 