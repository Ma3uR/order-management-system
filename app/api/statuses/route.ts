import { NextResponse } from 'next/server';
import pb, { getPocketBase } from '@/lib/pocketbase';
import { ClientResponseError } from 'pocketbase';

export async function GET() {
  try {
    const pb = getPocketBase();
    const records = await pb.collection('status_options').getFullList();
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json({ error: 'Error fetching statuses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, color, priority } = await request.json();
    
    // Ensure priority is always a valid number
    const priorityValue = typeof priority === 'number' ? priority : 
                         typeof priority === 'string' ? parseInt(priority) : 0;
    
    if (isNaN(priorityValue)) {
      return NextResponse.json({ 
        error: 'Invalid priority value',
        details: 'Priority must be a valid number'
      }, { 
        status: 400 
      });
    }

    // Check if priority already exists
    const pb = getPocketBase();
    const existingStatus = await pb.collection('status_options').getList(1, 1, {
      filter: `priority = ${priorityValue}`
    });

    if (existingStatus.totalItems > 0) {
      return NextResponse.json({ 
        error: 'Priority already exists',
        details: `A status with priority ${priorityValue} already exists`
      }, { 
        status: 400 
      });
    }

    const data = {
      name,
      color,
      priority: priorityValue
    };

    console.log('Creating status with data:', data);

    const record = await pb.collection('status_options').create(data);
    return NextResponse.json(record);
  } catch (error) {
    if (error instanceof ClientResponseError) {
      console.error('PocketBase error details:', {
        status: error.status,
        message: error.message,
        data: error.data
      });
      
      return NextResponse.json({ 
        error: 'Error creating status',
        details: error.response?.data || error.message
      }, { 
        status: error.status 
      });
    }
    
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { 
      status: 500 
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const pb = getPocketBase();
    await pb.collection('status_options').delete(id);
    return NextResponse.json({ message: 'Status deleted successfully' });
  } catch (error) {
    console.error('Error deleting status:', error);
    return NextResponse.json({ error: 'Error deleting status' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, color, priority } = await request.json();
    const pb = getPocketBase();
    const record = await pb.collection('status_options').update(id, {
      name,
      color,
      priority: priority || 0
    });
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Error updating status' }, { status: 500 });
  }
}
