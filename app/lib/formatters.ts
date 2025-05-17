import { Message } from 'ai';
import { detectLanguage, translations } from './utils/language';

/**
 * Format order data into a readable message
 */
export function formatOrderMessage(orderData: Record<string, unknown>, userMessages?: Array<Message>): string {
  // Detect language from the last user message, default to English
  const language: 'uk' | 'en' = userMessages && userMessages.length > 0 
    ? detectLanguage(String(userMessages[userMessages.length - 1].content))
    : 'en';
  
  const t = translations[language];
  
  if (!orderData || typeof orderData !== 'object') {
    return t.noOrderData;
  }

  // Handle error cases
  if ('error' in orderData && orderData.error) {
    return `${t.error}: ${orderData.error}${orderData.details ? ` - ${orderData.details}` : ''}`;
  }
  
  if ('message' in orderData && orderData.message) {
    return String(orderData.message);
  }

  // Format order count response
  if ('count' in orderData && !('id' in orderData)) {
    return `${t.countIntro} ${orderData.count} ${t.countPrompt}`;
  }

  // Format last order response
  try {
    let message = `${t.orderIntro}\n\n`;
    
    const formattedDate = 'createdAt' in orderData && orderData.createdAt 
      ? new Date(String(orderData.createdAt)).toLocaleString(language === 'uk' ? 'uk-UA' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : t.unknownDate;

    message += `📦 ${t.order} #${('orderNumber' in orderData && orderData.orderNumber) || ('id' in orderData && orderData.id) || 'Unknown'}\n\n`;
    message += `📅 ${t.created}: ${formattedDate}\n`;
    
    if ('statusName' in orderData && orderData.statusName && orderData.statusName !== 'Not specified') {
      message += `🏷️ ${t.status}: ${orderData.statusName}\n`;
    }
    
    if ('customer' in orderData && orderData.customer && orderData.customer !== 'Not available') {
      message += `👤 ${t.customer}: ${orderData.customer}\n`;
    }
    
    // Format total with currency
    message += `💰 ${t.total}: `;
    if ('total' in orderData && orderData.total !== undefined) {
      message += `${orderData.total}`;
      if ('currencySymbol' in orderData && orderData.currencySymbol) {
        message += ` ${orderData.currencySymbol}`;
      } else if ('currencyCode' in orderData && orderData.currencyCode && orderData.currencyCode !== 'Not specified') {
        message += ` ${orderData.currencyCode}`;
      }
    } else {
      message += t.notSpecified;
    }
    message += '\n';
    
    // Add payment method if specified
    if ('paymentMethod' in orderData && orderData.paymentMethod && orderData.paymentMethod !== 'Not specified') {
      message += `💳 ${t.payment}: ${orderData.paymentMethod}\n`;
    }
    
    // Add delivery method if specified
    if ('deliveryMethod' in orderData && orderData.deliveryMethod && orderData.deliveryMethod !== 'Not specified') {
      message += `🚚 ${t.delivery}: ${orderData.deliveryMethod}\n`;
    }
    
    // Add items information
    if ('itemsCount' in orderData && orderData.itemsCount !== undefined) {
      message += `\n📝 ${t.items} (${orderData.itemsCount}):\n`;
      
      if ('items' in orderData && Array.isArray(orderData.items) && orderData.items.length > 0) {
        orderData.items.forEach((item: {name?: string, quantity?: number, price?: number}, index: number) => {
          message += `${index + 1}. ${item.name || 'Unnamed'} - `;
          message += `${item.quantity || 1}x ${item.price || 0}`;
          if ('currencySymbol' in orderData && orderData.currencySymbol) {
            message += ` ${orderData.currencySymbol}`;
          }
          message += '\n\n';
        });
      } else {
        message += `${t.noItemDetails}\n\n`;
      }
    }
    
    // Add a prompt for further questions
    message += `\n${t.orderPrompt}`;
    
    return message;
  } catch (error) {
    console.error('Error formatting order message:', error);
    // If anything fails, return a simpler format
    return `${t.orderIntro} ${('orderNumber' in orderData && orderData.orderNumber) || ('id' in orderData && orderData.id) || 'Unknown'}: ${t.created} ${'createdAt' in orderData && orderData.createdAt ? new Date(String(orderData.createdAt)).toLocaleString(language === 'uk' ? 'uk-UA' : 'en-US') : t.unknownDate}`; 
  }
} 