import { NextResponse } from 'next/server';
import axios from 'axios';

const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

export async function POST(request: Request) {
  try {
    console.log('Rozetka auth endpoint called');
    
    // Encode password to base64
    const base64Password = Buffer.from(process.env.ROZETKA_PASSWORD || '').toString('base64');

    console.log('Making request to Rozetka API...');
    const response = await axios.post(`${ROZETKA_API_BASE}/sites`, {
      username: process.env.ROZETKA_USERNAME,
      password: base64Password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept-Validate-Exception': '1',
        'Content-Language': 'uk'
      }
    });    

    console.log('Rozetka API response:', response.data);

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
    console.error('Rozetka authentication failed:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    return NextResponse.json({
      success: false,
      errors: {
        description: error.response?.data?.errors?.description || error.message || 'Authentication failed',
        code: error.response?.status || 500
      }
    }, { status: error.response?.status || 500 });
  }
}