import { testRedisConnection } from './redis';
import { initializeFiscalQueue, FiscalQueueProcessor } from './queues/fiscal-queue';

let isInitialized = false;

/**
 * Initialize server-side services
 * Should be called once when the application starts
 */
export async function initializeServer(): Promise<void> {
  if (isInitialized) {
    console.log('[ServerInit] Already initialized, skipping...');
    return;
  }

  console.log('[ServerInit] Initializing server services...');

  try {
    // Test Redis connection
    console.log('[ServerInit] Testing Redis connection...');
    const redisConnected = await testRedisConnection();
    
    if (!redisConnected) {
      console.error('[ServerInit] Redis connection failed. BullMQ services will not be available.');
      console.error('[ServerInit] Please check your Redis configuration:');
      console.error('  REDIS_HOST:', process.env.REDIS_HOST || 'not set');
      console.error('  REDIS_PORT:', process.env.REDIS_PORT || 'not set');
      console.error('  REDIS_URL:', process.env.REDIS_URL ? 'set' : 'not set');
      return;
    }

    // Initialize BullMQ fiscal queue
    console.log('[ServerInit] Initializing BullMQ fiscal automation queue...');
    initializeFiscalQueue();
    
    // Give the worker a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (FiscalQueueProcessor.isWorkerProcessing()) {
      console.log('[ServerInit] ✅ BullMQ fiscal worker started successfully');
    } else {
      console.warn('[ServerInit] ⚠️  BullMQ fiscal worker may not have started correctly');
    }

    isInitialized = true;
    console.log('[ServerInit] ✅ Server initialization completed successfully');

  } catch (error) {
    console.error('[ServerInit] ❌ Server initialization failed:', error);
    // Don't throw - let the app continue without queue services
  }
}

/**
 * Graceful shutdown of server services
 */
export async function shutdownServer(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  console.log('[ServerInit] Shutting down server services...');

  try {
    const { shutdownFiscalQueue } = await import('./queues/fiscal-queue');
    await shutdownFiscalQueue();
    
    const { closeRedisConnection } = await import('./redis');
    await closeRedisConnection();
    
    isInitialized = false;
    console.log('[ServerInit] ✅ Server shutdown completed');
  } catch (error) {
    console.error('[ServerInit] ❌ Server shutdown failed:', error);
  }
}

/**
 * Check if server is initialized
 */
export function isServerInitialized(): boolean {
  return isInitialized;
}
