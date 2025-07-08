/**
 * Jest Setup File
 * 
 * This file runs before all test suites and sets up the testing environment.
 */

// Set up environment variables for testing
// Note: NODE_ENV is typically set by the test runner
process.env.ENABLE_AUTO_FISCAL = 'true';
process.env.AUTO_CASHIER_NAME = 'Test Cashier';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.TELEGRAM_CHAT_ID = 'test-chat-id';
process.env.CASA_VCHASNO_TOKEN = 'test-casa-token';

// Mock console.log for cleaner test output
const originalLog = console.log;
console.log = (...args: any[]) => {
  // Only log in tests if explicitly needed
  if (process.env.JEST_VERBOSE) {
    originalLog(...args);
  }
};

// Global test timeout
jest.setTimeout(10000);
