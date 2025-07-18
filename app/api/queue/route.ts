import { NextRequest, NextResponse } from 'next/server';
import { FiscalQueueManager, FiscalQueueProcessor } from '@/app/lib/queues/fiscal-queue';
import { testRedisConnection } from '@/app/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return await getQueueStatus();
      case 'stats':
        return await getQueueStats();
      case 'test-redis':
        return await testRedis();
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[QueueAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'pause':
        await FiscalQueueManager.pauseQueue();
        return NextResponse.json({ success: true, message: 'Queue paused' });
      
      case 'resume':
        await FiscalQueueManager.resumeQueue();
        return NextResponse.json({ success: true, message: 'Queue resumed' });
      
      case 'clean':
        await FiscalQueueManager.cleanQueue();
        return NextResponse.json({ success: true, message: 'Queue cleaned' });
      
      case 'add-job':
        const body = await request.json();
        const { orderId, orderNumber, options = {} } = body;
        
        if (!orderId || !orderNumber) {
          return NextResponse.json({ error: 'orderId and orderNumber are required' }, { status: 400 });
        }
        
        const job = await FiscalQueueManager.addFiscalJob(orderId, orderNumber, options);
        return NextResponse.json({ 
          success: true, 
          jobId: job.id,
          message: `Job added for order ${orderNumber}` 
        });
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[QueueAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }
    
    await FiscalQueueManager.removeJob(jobId);
    return NextResponse.json({ success: true, message: `Job ${jobId} removed` });
    
  } catch (error) {
    console.error('[QueueAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getQueueStatus() {
  const stats = await FiscalQueueManager.getQueueStats();
  const isWorkerRunning = FiscalQueueProcessor.isWorkerProcessing();
  const redisConnected = await testRedisConnection();
  
  return NextResponse.json({
    redis: {
      connected: redisConnected,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379'
    },
    worker: {
      running: isWorkerRunning,
      status: isWorkerRunning ? 'active' : 'inactive'
    },
    queue: {
      name: 'fiscal-automation',
      ...stats
    },
    environment: {
      fiscal_automation_enabled: process.env.ENABLE_AUTO_FISCAL === 'true',
      cashier_name: process.env.AUTO_CASHIER_NAME || 'AUTO'
    }
  });
}

async function getQueueStats() {
  const stats = await FiscalQueueManager.getQueueStats();
  return NextResponse.json(stats);
}

async function testRedis() {
  const connected = await testRedisConnection();
  return NextResponse.json({
    connected,
    timestamp: new Date().toISOString(),
    config: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
      url_provided: !!process.env.REDIS_URL
    }
  });
}
