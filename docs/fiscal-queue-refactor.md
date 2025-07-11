# Fiscal Queue Refactor - Migration Notes

## Overview

This document outlines the migration notes and testing results for the fiscal queue refactor implemented using BullMQ and Redis. The refactor modernizes the fiscal automation system by introducing a robust queue-based architecture for processing fiscal receipts.

## Migration Summary

### Key Changes

1. **Queue System Migration**: Migrated from direct database polling to BullMQ-based queue system
2. **Redis Integration**: Added Redis as the queue backend for reliable job processing
3. **Enhanced UI**: Implemented comprehensive queue management interface in the fiscal dashboard
4. **API Improvements**: Restructured queue API endpoints for better functionality

### Architecture Changes

- **Before**: Direct database queries with cron-based scheduling
- **After**: Event-driven queue system with Redis persistence and BullMQ job management

## Testing Results

### Local Testing Setup (Date: 2025-07-07)

#### Redis Configuration
- **Docker Compose**: `docker-compose.redis.yml`
- **Image**: `redis:7-alpine`
- **Port**: `6379`
- **Password**: `testpassword123`
- **Status**: ✅ Successfully running

#### Queue API Testing

Successfully tested all queue endpoints:

1. **Redis Connection Test**
   ```bash
   GET /api/queue?action=test-redis
   ```
   - Status: ✅ Connected
   - Host: localhost:6379
   - Response time: <100ms

2. **Queue Status Check**
   ```bash
   GET /api/queue?action=status
   ```
   - Redis connected: ✅ True
   - Worker status: Inactive (expected for local testing)
   - Environment: Fiscal automation enabled
   - Cashier: "Бот"

3. **Job Addition Testing**
   ```bash
   POST /api/queue?action=add-job
   Content-Type: application/json
   {
     "orderId": "test-order-X",
     "orderNumber": "TEST-00X",
     "options": {"priority": X}
   }
   ```
   
   **Test Results:**
   - TEST-001: ✅ Job ID: 3
   - TEST-002: ✅ Job ID: 4  
   - TEST-003: ✅ Job ID: 5
   - TEST-004: ✅ Job ID: 6 (with delay)

4. **Queue Statistics**
   ```json
   {
     "waiting": 0,
     "active": 0,
     "completed": 2,
     "failed": 0,
     "delayed": 1,
     "total": 1
   }
   ```

#### UI Testing

✅ **Fiscal Dashboard**: Successfully loaded at `/en/fiscal`

**Automation Queue Tab Features Verified:**
- Queue statistics display
- Real-time status updates
- Job management interface
- Scheduler configuration view
- Redis connection status

### Components Tested

1. **AutomationQueue Component** (`/app/components/features/fiscal/automation-queue.tsx`)
   - ✅ Queue statistics rendering
   - ✅ Scheduler status display
   - ✅ Job list with status badges
   - ✅ Manual queue processing
   - ✅ Retry/Remove job actions

2. **Queue API** (`/app/api/queue/route.ts`)
   - ✅ GET endpoints (status, stats, test-redis)
   - ✅ POST endpoints (add-job, pause, resume, clean)
   - ✅ DELETE endpoints (job removal)
   - ✅ Error handling and validation

3. **Redis Integration**
   - ✅ Connection stability
   - ✅ Job persistence
   - ✅ Queue state management

## Migration Checklist

### Pre-Migration
- [x] Backup existing fiscal data
- [x] Document current automation flows
- [x] Identify dependent systems

### Migration Steps
- [x] Install Redis (Docker or self-hosted)
- [x] Configure Redis connection variables
- [x] Deploy BullMQ queue system
- [x] Update fiscal automation logic
- [x] Migrate existing UI components
- [x] Test queue API endpoints

### Post-Migration Verification
- [x] Verify Redis connectivity
- [x] Test job creation and processing
- [x] Validate UI queue management
- [x] Monitor error handling
- [x] Check performance metrics

## Configuration Requirements

### Environment Variables
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=testpassword123

# Fiscal Automation
ENABLE_AUTO_FISCAL=true
AUTO_CASHIER_NAME=Бот
FISCAL_AUTOMATION_START_HOUR=9
FISCAL_AUTOMATION_END_HOUR=18
```

### Docker Setup
```bash
# Start Redis
npm run redis:local:start

# Check Redis logs
npm run redis:local:logs

# Stop Redis
npm run redis:local:stop
```

## Performance Improvements

1. **Queue Processing**: Asynchronous job processing improves response times
2. **Error Handling**: Better retry mechanisms and error tracking
3. **Monitoring**: Real-time queue statistics and job status tracking
4. **Scalability**: Redis-based architecture supports horizontal scaling

## Known Issues & Solutions

### Issue: Worker Status Shows Inactive
**Cause**: Local development environment doesn't auto-start worker processes
**Solution**: Use manual "Process Queue" button in UI or API endpoint

### Issue: Jobs Complete Too Quickly
**Cause**: Test mode with minimal processing logic
**Solution**: Add delays for testing or use production configuration

## Rollback Plan

If issues occur:

1. **Immediate Rollback**:
   - Revert to previous codebase version
   - Disable fiscal automation temporarily
   - Process pending receipts manually

2. **Data Recovery**:
   - Redis data persists in Docker volumes
   - Queue state can be restored from Redis snapshots
   - Manual fiscal receipt processing available

## Monitoring & Maintenance

### Key Metrics to Monitor
- Queue processing rate
- Job failure rate
- Redis memory usage
- API response times

### Regular Maintenance
- Redis memory optimization
- Failed job cleanup
- Performance monitoring
- Log rotation

## Future Enhancements

1. **Advanced Scheduling**: Cron-based job scheduling
2. **Queue Prioritization**: Dynamic priority adjustment
3. **Batch Processing**: Multiple receipt processing
4. **Analytics Dashboard**: Queue performance metrics
5. **Alerting System**: Failed job notifications

## Support & Troubleshooting

### Common Commands
```bash
# Check queue status
curl "http://localhost:3000/api/queue?action=status"

# Add test job
curl -X POST "http://localhost:3000/api/queue?action=add-job" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "test", "orderNumber": "TEST-001"}'

# Check Redis connection
curl "http://localhost:3000/api/queue?action=test-redis"
```

### Logs Location
- Application logs: Console/PM2 logs
- Redis logs: `docker compose -f docker-compose.redis.yml logs`
- Queue processing: Check fiscal automation logs

---

**Migration Status**: ✅ Complete  
**Test Date**: July 7, 2025  
**Tested By**: System Administrator  
**Next Review**: July 14, 2025
