'use server'

import { ensureValidToken } from "@/app/actions/rozetka";

export async function checkConnection(silent: boolean = false) {
  try {
    await ensureValidToken();
    console.log('Connection check successful, silent:', silent);
    return { success: true };
  } catch (error) {
    console.error('Connection check failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 