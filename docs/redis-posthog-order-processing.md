# Redis + PostHog + Order Processing Integration

## Overview

This document describes the integration between Redis, PostHog, and order processing functionality within the Order Management System. The system uses BullMQ for job queue management, Redis as the message broker, and PostHog for analytics tracking during working hours order processing.

## Architecture

### Components

1. **Redis**: Message broker and cache for BullMQ job queues
2. **BullMQ**: Job queue system for processing orders asynchronously
3. **PostHog**: Analytics platform for tracking order processing metrics
4. **Order Processing Workers**: Background jobs that handle order workflow

### Data Flow

```
Order Created → BullMQ Queue → Redis → Worker Processing → PostHog Events
```

## Redis Configuration

### Development Environment

For local development, Redis runs in a Docker container using Docker Compose.

#### Setup

1. **Start Redis Container**:
   ```bash
   docker compose up -d
   ```

2. **Environment Configuration** (`.env.local`):
   ```env
   # Local Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=testpassword123
   REDIS_DB=0
   ```

3. **Docker Compose Configuration** (`docker-compose.redis.yml`):
   ```yaml
   services:
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       command: redis-server --requirepass testpassword123
   ```

#### Requirements

- Docker Desktop must be running on macOS
- Use modern `docker compose` command (not deprecated `docker-compose`)

### Production Environment

For production, Redis is hosted within Coolify's internal network.

#### Configuration

1. **Environment Variables** (`.env`):
   ```env
   # Production Redis Configuration
   REDIS_HOST=redis-database-h8g0cok08scgkcswoksk4o0o.internal
   REDIS_PORT=6379
   REDIS_PASSWORD=your_production_password
   REDIS_DB=0
   ```

2. **Network Access**:
   - Internal hostname only accessible within Coolify network
   - For external access, use public hostname/IP from Coolify dashboard

## BullMQ Integration

### Configuration

The Redis client for BullMQ requires specific configuration in `app/lib/redis.ts`:

```typescript
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null, // Required for BullMQ
};
```

### Queue Management

1. **Job Types**:
   - Order processing
   - Payment verification
   - Inventory updates
   - Notification sending

2. **Worker Configuration**:
   - Concurrency based on system resources
   - Retry logic for failed jobs
   - Working hours scheduling

### Working Hours Processing

Orders are processed during configured working hours to ensure:
- Optimal resource utilization
- Business hour availability
- Proper staff coverage

## PostHog Analytics

### Event Tracking

The system tracks key metrics during order processing:

1. **Order Events**:
   - Order created
   - Order processed
   - Payment completed
   - Order fulfilled

2. **Performance Metrics**:
   - Processing time
   - Queue depth
   - Success/failure rates
   - Worker utilization

### Configuration

PostHog integration is configured to track order processing events with proper user identification and feature flags.

## Testing

### Local Testing

Run the BullMQ Redis integration tests:

```bash
npm run test:bullmq-redis
```

### Test Coverage

The test suite covers:
- Redis connection establishment
- Queue and worker initialization
- Job processing workflow
- Error handling and retries
- Queue cleanup operations

### Expected Results

- ✅ All 7 tests should pass
- ✅ Queue and worker start successfully
- ✅ Jobs are processed correctly
- ✅ Cleanup operations work properly

## Deployment

### Environment Switching

#### Development to Production

1. **Update Environment Variables**:
   ```bash
   # Comment out local Redis config
   # REDIS_HOST=localhost
   
   # Enable production Redis config
   REDIS_HOST=redis-database-h8g0cok08scgkcswoksk4o0o.internal
   ```

2. **Verify Coolify Configuration**:
   - Check Coolify dashboard
   - Navigate to Environment > Database
   - Confirm Redis connection details

#### Production to Development

1. **Start Local Redis**:
   ```bash
   docker compose up -d
   ```

2. **Switch Environment Variables**:
   ```bash
   # Enable local Redis config
   REDIS_HOST=localhost
   
   # Comment out production Redis config
   # REDIS_HOST=redis-database-h8g0cok08scgkcswoksk4o0o.internal
   ```

## Troubleshooting

### Common Issues

1. **DNS Lookup Failure**:
   - Error: `getaddrinfo ENOTFOUND h8g0cok08scgkcswoksk4o0o.internal`
   - Solution: Use local Redis for development or correct public hostname

2. **Worker Startup Failure**:
   - Error: Redis connection issues
   - Solution: Ensure `maxRetriesPerRequest: null` in Redis config

3. **Docker Compose Issues**:
   - Error: `docker-compose` command not found
   - Solution: Use modern `docker compose` syntax

### Health Checks

1. **Redis Connection**:
   ```bash
   npm run test:bullmq-redis
   ```

2. **Docker Status**:
   ```bash
   docker compose ps
   ```

3. **Redis Logs**:
   ```bash
   docker compose logs redis
   ```

## Best Practices

1. **Environment Management**:
   - Use separate `.env` files for different environments
   - Never commit production credentials
   - Use Docker Compose for local development

2. **Job Processing**:
   - Implement proper error handling
   - Use appropriate retry strategies
   - Monitor queue depth and processing times

3. **Analytics**:
   - Track meaningful business metrics
   - Use PostHog feature flags for gradual rollouts
   - Monitor order processing performance

## Performance Considerations

1. **Redis Memory Usage**:
   - Monitor Redis memory consumption
   - Implement appropriate TTL for jobs
   - Use Redis persistence settings

2. **Worker Scaling**:
   - Scale workers based on queue depth
   - Monitor CPU and memory usage
   - Implement graceful shutdowns

3. **Analytics Impact**:
   - Batch PostHog events when possible
   - Avoid blocking operations for analytics
   - Use async event sending

## Security

1. **Redis Security**:
   - Use strong passwords
   - Restrict network access
   - Enable Redis AUTH

2. **Environment Variables**:
   - Secure credential storage
   - Use environment-specific configurations
   - Regular password rotation

## Monitoring

1. **Key Metrics**:
   - Queue processing rate
   - Job success/failure ratio
   - Redis memory usage
   - Worker health status

2. **Alerting**:
   - Queue depth thresholds
   - Processing time limits
   - Error rate monitoring
   - System resource usage

## Future Enhancements

1. **Scaling**:
   - Redis clustering for high availability
   - Multiple worker instances
   - Load balancing strategies

2. **Features**:
   - Priority queue implementation
   - Delayed job scheduling
   - Advanced retry logic

3. **Monitoring**:
   - Enhanced PostHog dashboards
   - Real-time queue monitoring
   - Performance optimization tools

---

*Last updated: 2025-07-06*
*Version: 1.0*
