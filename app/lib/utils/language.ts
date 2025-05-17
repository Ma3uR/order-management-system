/**
 * Detects the language of a text (simplified version for English/Ukrainian)
 */
export function detectLanguage(text: string): 'uk' | 'en' {
  // Simple detection based on common Ukrainian characters
  const ukrChars = 'їєіґащшчухїйцукенгшщзхїфівапролджєячсмитьбю';
  const normalizedText = text.toLowerCase();
  
  for (const char of normalizedText) {
    if (ukrChars.includes(char)) {
      return 'uk';
    }
  }
  
  return 'en';
}

/**
 * Translations for chat messages
 */
export const translations = {
  en: {
    orderIntro: 'Here is the most recent order in your system:',
    orderPrompt: 'Is there anything specific about this order you would like to know?',
    countIntro: 'I\'ve checked the system. There are currently',
    countPrompt: 'orders in total. Is there anything specific you\'d like to know about them?',
    unknownDate: 'Unknown date',
    noItemDetails: 'No item details available',
    noOrderData: 'No order data available',
    created: 'Created',
    status: 'Status',
    customer: 'Customer',
    total: 'Total',
    payment: 'Payment',
    delivery: 'Delivery',
    items: 'Items',
    notSpecified: 'Not specified',
    error: 'Error',
    order: 'Order'
  },
  uk: {
    orderIntro: 'Ось найновіше замовлення у вашій системі:',
    orderPrompt: 'Чи є щось конкретне про це замовлення, що ви хотіли б дізнатися?',
    countIntro: 'Я перевірив систему. На даний момент у вас',
    countPrompt: 'замовлень. Чи є щось конкретне, що ви хотіли б дізнатися про них?',
    unknownDate: 'Дата невідома',
    noItemDetails: 'Немає доступних деталей товарів',
    noOrderData: 'Немає доступних даних про замовлення',
    created: 'Створено',
    status: 'Статус',
    customer: 'Клієнт',
    total: 'Сума',
    payment: 'Оплата',
    delivery: 'Доставка',
    items: 'Товари',
    notSpecified: 'Не вказано',
    error: 'Помилка',
    order: 'Замовлення'
  }
}; 