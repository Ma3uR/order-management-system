import { NextResponse } from 'next/server';
import axios from 'axios';

const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = request.headers.get('Authorization')?.split(' ')[1];

  if (!token) {
    return NextResponse.json(
      { success: false, errors: { description: 'No token provided', code: 401 } },
      { status: 401 }
    );
  }

  try {
    console.log('Fetching Rozetka orders with params:', Object.fromEntries(searchParams));
    
    const response = await axios.get(`${ROZETKA_API_BASE}/orders/search`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Validate-Exception': '1',
        'Content-Language': 'uk'
      },
      params: Object.fromEntries(searchParams)
    });

    console.log('Rozetka API response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    if (!response.data?.content) {
      throw new Error('Invalid response format from Rozetka API');
    }
    
    return NextResponse.json({
      success: true,
      content: response.data.content
    });
  } catch (error: any) {
    console.error('Failed to fetch Rozetka orders:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    return NextResponse.json({
      success: false,
      errors: {
        description: error.response?.data?.errors?.description || error.message || 'Failed to fetch orders',
        code: error.response?.status || 500
      }
    }, { status: error.response?.status || 500 });
  }
} 