import axios from 'axios';

const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

let cachedToken: string | null = null;
let tokenExpiry: Date | null = null;

export async function getAccessToken(): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new Error('getAccessToken can only be used on the server side');
  }

  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const base64Password = Buffer.from(process.env.ROZETKA_PASSWORD || '').toString('base64');
    
    const response = await axios.post(`${ROZETKA_API_BASE}/sites`, {
      username: process.env.ROZETKA_USERNAME,
      password: base64Password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data?.content?.access_token) {
      throw new Error('No access token in response');
    }

    cachedToken = response.data.content.access_token;
    tokenExpiry = new Date(Date.now() + (3600 * 1000 - 60000));

    return response.data.content.access_token;
  } catch (error) {
    console.error('Failed to get Rozetka access token:', error);
    throw error;
  }
} 