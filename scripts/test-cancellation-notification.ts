import { config } from 'dotenv';
import { sendCancellationNotification } from '../app/lib/services/telegram';
config();

const testData = {
  orderNumber: "TEST-12345",
  previousStatusName: "Нове замовлення",
  newStatusName: "Скасовано покупцем",
  fullName: "Тест Покупець",
  phoneNumber: "0991234567",
  totalAmount: 1500,
  currency: "₴",
  sourceName: "Rozetka",
  products: [
    { title: "Тестовий товар", quantity: 1, price: 1500 }
  ]
};

async function testCancellationNotification() {
  console.log('🧪 Testing cancellation notification...');
  console.log('Configuration check:');
  console.log('- ENABLE_STATUS_AUTOMATION:', process.env.ENABLE_STATUS_AUTOMATION);
  console.log('- TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('- TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID ? '✅ Set' : '❌ Missing');
  
  try {
    const result = await sendCancellationNotification(testData);
    
    if (result.success) {
      console.log('✅ Cancellation notification sent successfully!');
    } else {
      console.log('❌ Failed to send cancellation notification:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing cancellation notification:', error);
  }
}

testCancellationNotification();