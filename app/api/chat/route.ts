import { createOrGetUserChat, saveChat } from '@/app/lib/chat-store';
import { NextResponse } from 'next/server';
import { Message } from 'ai';
import { verifyUserId } from '@/app/lib/utils/auth';
import { createChatCompletion, continueChatWithFunctionResult } from '@/app/lib/services/openai';
import { formatOrderMessage } from '@/app/lib/formatters';
import { availableFunctions, executeFunction } from '@/app/lib/functions';

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
      
      // Create a stream from OpenAI with function calling
      const stream = await createChatCompletion(
        messages as Message[], 
        availableFunctions.map(func => ({
          type: 'function',
          function: func
        }))
      );
      
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
                
                // Only attempt follow-up if we have a valid function call ID
                if (functionCallId) {
                  try {
                    // Continue the conversation with the AI using the function result
                    await continueChatWithFunctionResult(
                      messages as Message[],
                      functionCallId,
                      functionCallName,
                      functionCallArguments,
                      functionResult
                    );
                    
                    // Return formatted message instead of raw data
                    const fallbackMsg = formatOrderMessage(functionResult, messages as Message[]);
                    
                    controller.enqueue(encoder.encode(fallbackMsg));
                    responseText += fallbackMsg;
                  } catch (followUpError) {
                    console.error('Error with follow-up response:', followUpError);
                    // Return formatted message instead of raw data
                    const fallbackMsg = formatOrderMessage(functionResult, messages as Message[]);
                    
                    controller.enqueue(encoder.encode(fallbackMsg));
                    responseText += fallbackMsg;
                  }
                } else {
                  // No function call ID available, provide formatted response
                  const simpleResponse = formatOrderMessage(functionResult, messages as Message[]);
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
              }] as Message[];
              
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