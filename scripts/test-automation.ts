import * as dotenv from 'dotenv';
import { getAutomationConfiguration } from '../app/lib/services/status-automation.js';
import { isTelegramEnabled, testTelegramConnection } from '../app/lib/services/telegram.js';

dotenv.config();

async function testAutomationConfiguration() {
  console.log('🧪 Testing Automation Configuration...\n');
  
  try {
    // Test automation service configuration
    console.log('📊 Automation Service:');
    const automationConfig = await getAutomationConfiguration();
    console.log(`  ✅ Enabled: ${automationConfig.enabled}`);
    console.log(`  🏪 Marketplaces: ${Object.keys(automationConfig.marketplaces).join(', ')}`);
    
    // Test Telegram service configuration
    console.log('\n📱 Telegram Service:');
    const telegramEnabled = await isTelegramEnabled();
    console.log(`  ✅ Enabled: ${telegramEnabled}`);
    
    // Test Telegram connection if enabled
    if (telegramEnabled) {
      console.log('  🔄 Testing connection...');
      const telegramTest = await testTelegramConnection();
      if (telegramTest.success) {
        console.log('  ✅ Connection test successful!');
      } else {
        console.log(`  ❌ Connection test failed: ${telegramTest.error}`);
      }
    }
    
    // Environment variables check
    console.log('\n🔧 Environment Variables:');
    const vars = {
      ENABLE_STATUS_AUTOMATION: process.env.ENABLE_STATUS_AUTOMATION || 'Not set',
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set',
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ? 'Set' : 'Not set',
      ROZETKA_TOKEN: process.env.ROZETKA_TOKEN ? 'Set' : 'Not set',
      PROM_UA_TOKEN: process.env.PROM_UA_TOKEN ? 'Set' : 'Not set',
      EPICENTR_TOKEN: process.env.EPICENTR_TOKEN ? 'Set' : 'Not set'
    };
    
    Object.entries(vars).forEach(([key, value]) => {
      const status = value === 'Set' ? '✅' : value === 'Not set' ? '❌' : '📝';
      console.log(`  ${status} ${key}: ${value}`);
    });
    
    // Configuration analysis
    console.log('\n📋 Configuration Analysis:');
    const issues: string[] = [];
    
    if (!automationConfig.enabled) {
      issues.push('Set ENABLE_STATUS_AUTOMATION=true');
    }
    
    if (!telegramEnabled) {
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        issues.push('Set TELEGRAM_BOT_TOKEN');
      }
      if (!process.env.TELEGRAM_CHAT_ID) {
        issues.push('Set TELEGRAM_CHAT_ID');
      }
    }
    
    // Check marketplace tokens
    if (!process.env.ROZETKA_TOKEN) {
      issues.push('Set ROZETKA_TOKEN');
    }
    
    if (!process.env.PROM_UA_TOKEN) {
      issues.push('Set PROM_UA_TOKEN');
    }
    
    if (!process.env.EPICENTR_TOKEN) {
      issues.push('Set EPICENTR_TOKEN');
    }
    
    if (issues.length === 0) {
      console.log('  🎉 All systems ready for automation!');
      console.log('  ▶️  Run: npm run sync:orders to test end-to-end');
    } else {
      console.log('  ⚠️  Configuration incomplete:');
      issues.forEach(issue => console.log(`    • ${issue}`));
      console.log('\n  📖 See docs/keys-setup-guide.md for detailed setup instructions');
    }
    
    // Next steps
    console.log('\n🚀 Next Steps:');
    if (issues.length > 0) {
      console.log('  1. Fix configuration issues above');
      console.log('  2. Re-run this test: npx tsx scripts/test-automation.ts');
      console.log('  3. Test with actual orders: npm run sync:orders');
    } else {
      console.log('  1. Test with actual orders: npm run sync:orders');
      console.log('  2. Monitor automation logs in sync output');
      console.log('  3. Check Telegram for notifications');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('  • Ensure all TypeScript files are compiled');
    console.error('  • Check that .env file exists and is loaded');
    console.error('  • Verify network connectivity for Telegram test');
  }
}

// Add graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n⏹️  Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Test terminated');
  process.exit(0);
});

// Run the test
console.log('🤖 Order Automation System - Configuration Test');
console.log('=' .repeat(50));
testAutomationConfiguration();