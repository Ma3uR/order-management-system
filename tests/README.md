# Jest Tests for Fiscal Queue

This directory contains Jest unit tests for the fiscal queue functionality.

## Test Coverage

The tests cover the following fiscal queue actions:

### 1. `getFiscalQueueStats`
- ✅ Returns correct queue statistics (total, pending, processing, completed, failed)
- ✅ Handles next scheduled job timestamp
- ✅ Handles missing next scheduled job
- ✅ Error handling

### 2. `getFiscalQueueItems`
- ✅ Returns paginated queue items with correct mapping
- ✅ Filters by status correctly (pending, processing, completed, failed)
- ✅ Handles pagination correctly
- ✅ Expands order data when requested
- ✅ Handles expand errors gracefully
- ✅ Error handling

### 3. `retryFiscalQueueItem`
- ✅ Retries failed jobs successfully
- ✅ Creates new job when no failed reason exists
- ✅ Returns error when job not found
- ✅ Error handling

### 4. `removeFiscalQueueItem`
- ✅ Removes jobs successfully
- ✅ Returns error when job not found
- ✅ Error handling

### 5. `cleanupFiscalQueue`
- ✅ Cleans up old completed and failed jobs
- ✅ Uses default cleanup period (7 days) when not specified
- ✅ Handles custom cleanup periods
- ✅ Error handling

## Mock Implementation

The tests use in-memory mock implementations of:

- **BullMQ Queue & Job classes** (`tests/mocks/bullmq.ts`)
  - Full job state management (waiting, delayed, active, completed, failed)
  - Job filtering and pagination
  - Queue statistics
  - Job cleanup functionality

- **PocketBase authentication & database** (`tests/mocks/pocketbase.ts`)
  - Mock order and receipt data
  - Collection operations (getOne, getList, create, update, delete)
  - Authenticated call wrapper

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run only fiscal queue tests
```bash
npm test fiscal-queue
```

### Run tests with coverage
```bash
npm test -- --coverage
```

## Test Structure

```
tests/
├── fiscal-queue.test.ts          # Main test file
├── mocks/
│   ├── bullmq.ts                # BullMQ mock implementations
│   └── pocketbase.ts            # PocketBase mock implementations
├── setup.ts                     # Jest setup configuration
└── README.md                    # This file
```

## Configuration

Jest configuration is located in `jest.config.js` with:
- TypeScript support via `ts-jest`
- ESM module support
- Path mapping for `@/` imports
- Node.js test environment
- Setup file for global test configuration

## Environment Variables

Test environment variables are set in `tests/setup.ts`:
- `ENABLE_AUTO_FISCAL=true`
- `AUTO_CASHIER_NAME=Test Cashier`
- Test tokens for external services

## Edge Cases Tested

- Empty queue handling
- Large page number handling
- Job state transitions
- Network error simulation
- Data validation errors
- Concurrent access scenarios

## CI Integration

The test script is ready for CI/CD integration with:
- Non-interactive execution
- Clear exit codes (0 = success, 1 = failure)
- Structured output for parsing
- Coverage reporting support
