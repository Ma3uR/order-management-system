"use server"

import { validatePocketbaseResponse } from "@/app/lib/api-utils";
import pb from "@/app/lib/pocketbase";
import { ChatsResponse } from "@/app/types/pocketbase-types";
import { z } from "zod";

// Define a schema for chat validation
const chatSchema = z.object({
  id: z.string().optional(),
  messages: z.array(z.any()).or(z.null()).optional(),
  user: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  collectionId: z.string().optional(),
  collectionName: z.string().optional(),
  expand: z.any().optional()
});

export type ChatData = z.infer<typeof chatSchema>;

export const getChats = async () => {
  try {
    const chats = await pb.collection('chats').getFullList({
      sort: '-created',
      expand: 'user'
    });
    const validatedChats = chats.map(chat => validatePocketbaseResponse(chat, chatSchema));
    return { error: undefined, data: validatedChats };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching chats:', error.message);
      return { error: error.message, data: undefined };
    }
    console.error('Error fetching chats:', error);
    return { error: 'Unknown error in getChats', data: undefined };
  }
};

export const getChat = async (id: string) => {
  try {
    const chat = await pb.collection('chats').getOne(id, {
      expand: 'user'
    });
    const validatedChat = validatePocketbaseResponse(chat, chatSchema);
    return { error: undefined, data: validatedChat };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching chat:', error.message);
      return { error: error.message, data: undefined };
    }
    console.error('Error fetching chat:', error);
    return { error: 'Unknown error in getChatById', data: undefined };
  }
};

export const createChat = async (data: ChatData) => {
  try {
    chatSchema.parse(data);
    const chat = await pb.collection('chats').create<ChatsResponse>(data);
    const validatedChat = validatePocketbaseResponse(chat, chatSchema);
    return { error: undefined, data: validatedChat };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in createChat:', error.message);
      return { error: error.message, data: undefined };
    }
    console.error('Error in createChat:', error);
    return { error: 'Unknown error in createChat', data: undefined };
  }
};

export const updateChat = async (id: string, data: ChatData) => {
  try {
    chatSchema.parse(data);
    const chat = await pb.collection('chats').update<ChatsResponse>(id, data);
    const validatedChat = validatePocketbaseResponse(chat, chatSchema);
    return { error: undefined, data: validatedChat };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in updateChat:', error.message);
      return { error: error.message, data: undefined };
    }
    console.error('Error in updateChat:', error);
    return { error: 'Unknown error in updateChat', data: undefined };
  }
};

export const deleteChat = async (id: string) => {
  try {
    const deletionStatus = await pb.collection('chats').delete(id);
    return { error: undefined, data: deletionStatus };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in deleteChat:', error.message);
      return { error: error.message, data: undefined };
    }
    console.error('Error in deleteChat:', error);
    return { error: 'Unknown error in deleteChat', data: undefined };
  }
};

export const saveMessages = async (userId: string, messages: ChatsResponse['messages']) => {
  try {
    // First try to find an existing chat for this user
    const chats = await pb.collection('chats').getFullList({
      filter: `user = "${userId}"`
    });
    
    // If no chat exists, create one
    if (!chats || chats.length === 0) {
      console.log(`No chat found for user ${userId}, creating new chat`);
      const newChat = await pb.collection('chats').create({
        user: userId,
        messages: messages
      });
      const validatedChat = validatePocketbaseResponse(newChat, chatSchema);
      return { error: undefined, data: validatedChat };
    }
    
    // Update the existing chat
    const chatId = chats[0].id;
    const updatedChat = await pb.collection('chats').update(chatId, {
      messages: messages
    });
    const validatedChat = validatePocketbaseResponse(updatedChat, chatSchema);
    return { error: undefined, data: validatedChat };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in saveMessages:', error.message);
      return { error: error.message, data: undefined };
    }
    console.error('Error in saveMessages:', error);
    return { error: 'Unknown error in saveMessages', data: undefined };
  }
};

export const getMessagesByUserId = async (userId: string) => {
  try {
    const chats = await pb.collection('chats').getFullList({
      filter: `user = "${userId}"`
    });
    
    // Return messages from the first chat found or empty array
    const chat = chats[0];
    return { error: undefined, data: chat?.messages || [] };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in getMessagesByUserId:', error.message);
      return { error: error.message, data: undefined };
    }
    console.error('Error in getMessagesByUserId:', error);
    return { error: 'Unknown error in getMessagesByUserId', data: undefined };
  }
};

export const getMessageCountByUserId = async (userId: string) => {
  try {
    const chats = await pb.collection('chats').getFullList({
      filter: `user = "${userId}"`
    });
    
    let totalMessages = 0;
    chats.forEach(chat => {
      if (Array.isArray(chat.messages)) {
        totalMessages += chat.messages.length;
      }
    });
    
    return { error: undefined, data: totalMessages };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error in getMessageCountByUserId:', error.message);
      return { error: error.message, data: undefined };
    }
    console.error('Error in getMessageCountByUserId:', error);
    return { error: 'Unknown error in getMessageCountByUserId', data: undefined };
  }
};
