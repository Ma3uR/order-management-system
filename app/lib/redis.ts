/**
 * Redis connection for BullMQ using ioredis
 */

import IORedis from 'ioredis';

// Create Redis client using ioredis
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  lazyConnect: true,
});

// Handle connection events
redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('Redis Client Connected');
});

redis.on('ready', () => {
  console.log('Redis Client Ready');
});

// Connect to Redis (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  redis.connect().catch(console.error);
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.disconnect();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
}

export { redis };