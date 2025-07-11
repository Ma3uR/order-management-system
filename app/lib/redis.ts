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

export { redis };