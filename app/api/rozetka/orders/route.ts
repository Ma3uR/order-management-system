import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = request.headers.get('Authorization')?.split(' ')[1];

  if (!token) {
    return NextResponse.json(
      { error: 'No token provided' },
      { status: 401 }
    );
  }

  try {
    const response = await axios.get(`${ROZETKA_API_BASE}/orders/search`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Validate-Exception': '1',
        'Content-Language': 'uk'
      },
      params: Object.fromEntries(searchParams)
    });
    
    return NextResponse.json({
      success: true,
      content: response.data.content || []
    });
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error('Failed to fetch Rozetka orders:', error.response?.data || error);
      return NextResponse.json({
        success: false,
        errors: {
          description: error.response?.data?.errors?.description || 'Failed to fetch orders',
          code: error.response?.data?.errors?.code || 500
        }
      }, { status: error.response?.status || 500 });
    }
    return NextResponse.json({ 
      success: false, 
      errors: { description: 'Unknown error occurred', code: 500 } 
    }, { status: 500 });
  }
}