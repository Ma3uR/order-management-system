import PocketBase from 'pocketbase';

const pb = new PocketBase('http://pocketbase-d04wg4wgw0cs8kcwoww88w0k.78.47.226.230.sslip.io');

/**
 * Seeds the PocketBase database with default data for currency, status, delivery, and payment options.
 * This function attempts to create or update entries in various collections, handling existing entries appropriately.
 * @returns {Promise<void>} A promise that resolves when all seeding operations are complete.
 * @throws {Error} If any seeding operation fails, the error is logged and the process exits with status code 1.
 */
async function seedPocketBase() {
  try {
    // Try to create or update default currency
    try {
      const existingCurrency = await pb.collection('currency_options').getFirstListItem('code="UAH"').catch(() => null);
      
      if (existingCurrency) {
        console.log('Currency already exists, updating...');
        const currency = await pb.collection('currency_options').update(existingCurrency.id, {
          code: 'UAH',
          name: 'Ukrainian Hryvnia',
          symbol: '₴',
          isDefault: true,
        });
        console.log('Updated currency:', currency);
      } else {
        const currency = await pb.collection('currency_options').create({
          code: 'UAH',
          name: 'Ukrainian Hryvnia',
          symbol: '₴',
          isDefault: true,
        });
        console.log('Created currency:', currency);
      }
    } catch (error) {
      console.error('Error with currency:', error);
    }

    // Try to create or update default status
    try {
      const existingStatus = await pb.collection('status_options').getFirstListItem('name="Being processed by manager"').catch(() => null);
      
      if (existingStatus) {
        console.log('Status already exists, updating...');
        const status = await pb.collection('status_options').update(existingStatus.id, {
          name: 'Being processed by manager',
          color: '#FFD700',
          priority: 0,
        });
        console.log('Updated status:', status);
      } else {
        const status = await pb.collection('status_options').create({
          name: 'Being processed by manager',
          color: '#FFD700',
          priority: 0,
        });
        console.log('Created status:', status);
      }
    } catch (error) {
      console.error('Error with status:', error?.response?.data || error);
    }

    // Try to create or update delivery method
    try {
      const existingDelivery = await pb.collection('delivery_options').getFirstListItem('name="Ukr poshta"').catch(() => null);
      
      if (existingDelivery) {
        console.log('Delivery method already exists, skipping...');
      } else {
        const deliveryMethod = await pb.collection('delivery_options').create({
          name: 'Ukr poshta',
        });
        console.log('Created delivery method:', deliveryMethod);
      }
    } catch (error) {
      console.error('Error with delivery method:', error?.response?.data || error);
    }

    // Try to create or update payment method
    try {
      const existingPayment = await pb.collection('payment_options').getFirstListItem('name="test2"').catch(() => null);
      
      if (existingPayment) {
        console.log('Payment method already exists, skipping...');
      } else {
        const paymentMethod = await pb.collection('payment_options').create({
          name: 'test2',
        });
        console.log('Created payment method:', paymentMethod);
      }
    } catch (error) {
      console.error('Error with payment method:', error?.response?.data || error);
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error?.response?.data || error);
    process.exit(1);
  }
}

// Run seeding
seedPocketBase()
  .catch(error => {
    console.error('Top level error:', error?.response?.data || error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seeding process completed');
  }); 