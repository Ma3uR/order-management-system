'use server'

import { 
  getDeliveryMethods as getRozetkaDeliveryMethods, 
  getPaymentMethods as getRozetkaPaymentMethods 
} from "@/app/actions/rozetka";
import { 
  getDeliveryMethods as getPromDeliveryMethods, 
  getPaymentMethods as getPromPaymentMethods 
} from "@/app/actions/prom-ua";
import pb from "@/app/lib/pocketbase";
import { authenticatedCall } from "@/app/lib/pocketbase";
import { createDeliveryMethod } from "./delivery-methods";
import { toast } from "sonner";
import { DeliveryMethodFormData, PaymentMethodFormData } from "@/app/lib/validations/settings";
import { createPaymentMethod } from "./payment-methods";


async function syncDeliveryMethods() {
  // Get methods from Rozetka
  const rozetkaResponse = await getRozetkaDeliveryMethods();
  const rozetkaDeliveryMethods = rozetkaResponse.deliveryServices || [];
  
  // Get methods from Prom.ua
  const promResponse = await getPromDeliveryMethods();
  const promDeliveryMethods = promResponse.data || [];

  console.log('promDeliveryMethods', promDeliveryMethods);

  let created = 0;

  // Sync Rozetka methods
  for (const method of rozetkaDeliveryMethods) {
    try {
      const existing = await authenticatedCall(() => 
        pb.collection('delivery_options').getList(1, 1, {
          filter: `rozetkaId = "${method.id}"`
        })
      );

      if (existing.items.length > 0) {
        console.log(`Delivery method ${method.id} already exists`);
        continue;
      }

      const preparedMethod: DeliveryMethodFormData = {
        name: method.name,
        rozetkaId: method.id,
      };

      await createDeliveryMethod(preparedMethod);
      created++;
    } catch (error) {
      console.error(`Failed to sync Rozetka delivery method ${method.id}:`, error);
      if (error instanceof Error && error.message !== 'Delivery method already exists') {
        toast.error(`Failed to sync Rozetka delivery method: ${error.message}`);
      }
    }
  }

  // Sync Prom.ua methods
  for (const method of promDeliveryMethods) {
    try {
      const existing = await authenticatedCall(() => 
        pb.collection('delivery_options').getList(1, 1, {
          filter: `promId = "${method.id}"`
        })
      );

      if (existing.items.length > 0) {
        console.log(`Prom.ua delivery method ${method.id} already exists`);
        continue;
      }

      const preparedMethod: DeliveryMethodFormData = {
        name: method.name,
        promId: method.id,
      };

      await createDeliveryMethod(preparedMethod);
      created++;
    } catch (error) {
      console.error(`Failed to sync Prom.ua delivery method ${method.id}:`, error);
      if (error instanceof Error && error.message !== 'Delivery method already exists') {
        toast.error(`Failed to sync Prom.ua delivery method: ${error.message}`);
      }
    }
  }

  return { created };
}

async function syncPaymentMethods() {
  // Get methods from Rozetka
  const rozetkaResponse = await getRozetkaPaymentMethods();
  const rozetkaPaymentMethods = rozetkaResponse.payment_methods || [];

  // Get methods from Prom.ua
  const promResponse = await getPromPaymentMethods();
  const promPaymentMethods = promResponse.data || [];
  console.log('promPaymentMethods', promPaymentMethods);

  let created = 0;

  // Sync Rozetka methods
  for (const method of rozetkaPaymentMethods) {
    try {
      const existing = await authenticatedCall(() => 
        pb.collection('payment_options').getList(1, 1, {
          filter: `rozetkaId = "${method.id}"`
        })
      );

      if (existing.items.length > 0) {
        throw new Error('Payment method already exists');
      } else {
        const preparedMethod: PaymentMethodFormData = {
          name: method.name,
          rozetkaId: method.id
        };
        await createPaymentMethod(preparedMethod);
        created++;
      }
    } catch (error:unknown) {
      if (error instanceof Error) {
        console.error(`Failed to sync Rozetka payment method ${method.id}:`, error.message);
      } else {
        toast.error(`Failed to sync Rozetka payment method ${method.id}: ${error}`);
        console.error(`Failed to sync Rozetka payment method ${method.id}:`, error);
      }
    }
  }

  // Sync Prom.ua methods
  for (const method of promPaymentMethods) {
    try {
      const existing = await authenticatedCall(() => 
        pb.collection('payment_options').getList(1, 1, {
          filter: `promId = "${method.id}"`
        })
      );

      if (existing.items.length > 0) {
        throw new Error('Payment method already exists');
      } else {
        const preparedMethod: PaymentMethodFormData = {
          name: method.name,
          promId: method.id
        };
        await createPaymentMethod(preparedMethod);
        created++;
      }
    } catch (error:unknown) {
      if (error instanceof Error) {
        console.error(`Failed to sync Prom.ua payment method ${method.id}:`, error.message);
      } else {
        toast.error(`Failed to sync Prom.ua payment method ${method.id}: ${error}`);
        console.error(`Failed to sync Prom.ua payment method ${method.id}:`, error);
      }
    }
  }

  return { created };
}

export async function syncMethods() {
  try {
    const [deliveryResults, paymentResults] = await Promise.all([
      syncDeliveryMethods(),
      syncPaymentMethods()
    ]);

    return {
      success: true,
      delivery: deliveryResults,
      payment: paymentResults
    };
  } catch (error) {
    console.error('Failed to sync methods:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 