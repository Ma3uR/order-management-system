import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { getAccessToken } from '@/app/lib/rozetka-auth';

const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

export async function GET() {
  try {
    const token = await getAccessToken();
    const response = await axios.get(`${ROZETKA_API_BASE}/sites/orders/available-deliveries`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json({
      success: true,
      content: response.data.content,
      errors: null
    });
  } catch (error) {
    console.error('Failed to fetch delivery methods:', error);
    
    if (error instanceof AxiosError) {
      return NextResponse.json({
        success: false,
        content: null,
        errors: {
          description: error.response?.data?.errors?.description || 'Failed to fetch delivery methods',
          code: error.response?.status || 500
        }
      }, { status: error.response?.status || 500 });
    }

    return NextResponse.json({
      success: false,
      content: null,
      errors: {
        description: 'Unknown error occurred',
        code: 500
      }
    }, { status: 500 });
  }
} 