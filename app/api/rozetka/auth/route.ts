import { NextResponse } from 'next/server';
import axios from 'axios';

const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

export async function POST() {
  try {
    // Encode password to base64
    const base64Password = Buffer.from(process.env.ROZETKA_PASSWORD || '').toString('base64');

    const response = await axios.post(`${ROZETKA_API_BASE}/sites`, {
      username: process.env.ROZETKA_USERNAME,
      password: base64Password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });    

    // Check if we have the token in the response
    if (!response.data?.content?.access_token) {
      throw new Error('No access token in response');
    }

    // Return the response in the expected format
    return NextResponse.json({
      success: true,
      content: {
        access_token: response.data.content.access_token
      }
    });
  } catch (error: any) {
    console.error('Rozetka authentication failed:', error.response?.data || error.message);
    
    return NextResponse.json({
      success: false,
      errors: {
        description: error.response?.data?.errors?.description || error.message || 'Authentication failed',
        code: error.response?.data?.errors?.code || 500
      }
    }, { status: error.response?.status || 500 });
  }
}