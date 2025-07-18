#!/usr/bin/env tsx

/**
 * Redis Connection Test Script for Coolify Deployment
 * 
 * Usage:
 * - In container: tsx scripts/test-redis-connection.ts
 * - With npm: npm run test:redis
 */

import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔧 Redis Connection Test Starting...\n');

// Display configuration
console.log('📋 Configuration:');
console.log(`  REDIS_URL: ${process.env.REDIS_URL ? 'SET' : 'NOT SET'}`);
console.log(`  REDIS_HOST: ${process.env.REDIS_HOST || 'NOT SET'}`);
console.log(`  REDIS_PORT: ${process.env.REDIS_PORT || 'NOT SET'}`);
console.log(`  REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? 'SET (hidden)' : 'NOT SET'}`);
console.log(`  REDIS_USERNAME: ${process.env.REDIS_USERNAME || 'NOT SET'}`);
console.log(`  REDIS_DB: ${process.env.REDIS_DB || 'NOT SET'}`);
console.log('');

async function testRedisConnection(): Promise<boolean> {
  let redis: Redis | null = null;
  
  try {
    console.log('🚀 Creating Redis connection...');
    
    // Use same logic as your app
    if (process.env.REDIS_URL) {
      console.log('📡 Using REDIS_URL connection string');
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });
    } else {
      console.log('🔧 Using individual Redis config parameters');
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        username: process.env.REDIS_USERNAME || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });
    }

    // Set up event listeners for debugging
    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redis.on('ready', () => {
      console.log('✅ Redis connection ready');
    });

    redis.on('error', (err: Error) => {
      console.error('❌ Redis connection error:', err.message);
    });

    redis.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Test basic connection
    console.log('🏓 Testing PING command...');
    const pingResult = await redis.ping();
    console.log(`✅ PING response: ${pingResult}`);

    // Test SET/GET operations
    console.log('💾 Testing SET/GET operations...');
    const testKey = `test:${Date.now()}`;
    const testValue = `test-value-${Math.random()}`;
    
    await redis.set(testKey, testValue);
    console.log(`✅ SET ${testKey} = ${testValue}`);
    
    const retrievedValue = await redis.get(testKey);
    console.log(`✅ GET ${testKey} = ${retrievedValue}`);
    
    if (retrievedValue === testValue) {
      console.log('✅ SET/GET test passed');
    } else {
      throw new Error(`SET/GET test failed: expected ${testValue}, got ${retrievedValue}`);
    }

    // Clean up test key
    await redis.del(testKey);
    console.log(`🗑️  Cleaned up test key: ${testKey}`);

    // Test Redis info
    console.log('📊 Getting Redis info...');
    const info = await redis.info('server');
    const lines = info.split('\n');
    const serverInfo: Record<string, string> = {};
    
    lines.forEach(line => {
      if (line.includes(':') && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          serverInfo[key] = value.trim();
        }
      }
    });

    console.log(`✅ Redis version: ${serverInfo.redis_version || 'unknown'}`);
    console.log(`✅ Redis mode: ${serverInfo.redis_mode || 'unknown'}`);
    console.log(`✅ OS: ${serverInfo.os || 'unknown'}`);

    // Test BullMQ compatibility (list operations)
    console.log('🐂 Testing BullMQ compatibility...');
    const queueKey = `bull:test-queue:${Date.now()}`;
    
    await redis.lpush(queueKey, 'test-job-1', 'test-job-2');
    console.log('✅ LPUSH test passed');
    
    const queueLength = await redis.llen(queueKey);
    console.log(`✅ Queue length: ${queueLength}`);
    
    const job = await redis.rpop(queueKey);
    console.log(`✅ RPOP result: ${job}`);
    
    // Clean up queue
    await redis.del(queueKey);
    console.log(`🗑️  Cleaned up test queue: ${queueKey}`);

    // Test hash operations (used by BullMQ for job data)
    console.log('🔧 Testing hash operations...');
    const hashKey = `hash:test:${Date.now()}`;
    
    await redis.hset(hashKey, 'field1', 'value1', 'field2', 'value2');
    console.log('✅ HSET test passed');
    
    const hashValues = await redis.hgetall(hashKey);
    console.log(`✅ HGETALL result:`, hashValues);
    
    await redis.del(hashKey);
    console.log(`🗑️  Cleaned up test hash: ${hashKey}`);

    // Test expiration (TTL)
    console.log('⏰ Testing TTL operations...');
    const ttlKey = `ttl:test:${Date.now()}`;
    
    await redis.set(ttlKey, 'expire-me', 'EX', 5);
    console.log('✅ SET with TTL test passed');
    
    const ttl = await redis.ttl(ttlKey);
    console.log(`✅ TTL: ${ttl} seconds`);
    
    await redis.del(ttlKey);
    console.log(`🗑️  Cleaned up TTL test key: ${ttlKey}`);

    console.log('\n🎉 All Redis tests passed successfully!');
    console.log('✅ Your Redis connection is working correctly');
    console.log('✅ BullMQ operations are fully supported');
    console.log('✅ Ready for fiscal automation queue processing');
    
    return true;

  } catch (error) {
    console.error('\n❌ Redis connection test failed:');
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    return false;
  } finally {
    if (redis) {
      console.log('\n🔌 Closing Redis connection...');
      await redis.quit();
    }
  }
}

// Health check endpoint simulation
async function healthCheck(): Promise<void> {
  console.log('\n🏥 Running health check...');
  
  const startTime = Date.now();
  const success = await testRedisConnection();
  const duration = Date.now() - startTime;
  
  console.log(`\n📈 Health check completed in ${duration}ms`);
  
  if (success) {
    console.log('🟢 Status: HEALTHY');
    console.log('\n💡 Next steps:');
    console.log('   1. Your Redis connection is ready');
    console.log('   2. You can now deploy your fiscal automation');
    console.log('   3. BullMQ queues will work correctly');
    process.exit(0);
  } else {
    console.log('🔴 Status: UNHEALTHY');
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your REDIS_URL environment variable');
    console.log('   2. Verify Redis server is running');
    console.log('   3. Check network connectivity to Redis host');
    console.log('   4. Verify Redis password and credentials');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  healthCheck().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { testRedisConnection };