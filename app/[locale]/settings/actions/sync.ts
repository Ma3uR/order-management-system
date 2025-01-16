'use server'

import { getAllDeliveryMethods, getPaymentMethods } from "@/app/actions/rozetka";
import pb from "@/app/lib/pocketbase";
import { authenticatedCall } from "@/app/lib/pocketbase";
import { createDeliveryMethod } from "./delivery-methods";
import { toast } from "sonner";
import { DeliveryMethodFormData, PaymentMethodFormData } from "@/app/lib/validations/settings";
import { createPaymentMethod } from "./payment-methods";

async function syncDeliveryMethods() {
  const response = await getAllDeliveryMethods();
  const deliveryMethods = response.deliveryServices || [];
  let created = 0;

  for (const method of deliveryMethods) {
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
      console.error(`Failed to sync delivery method ${method.id}:`, error);
      if (error instanceof Error && error.message !== 'Delivery method already exists') {
        toast.error(`Failed to sync delivery method: ${error.message}`);
      }
    }
  }

  return { created };
}

async function syncPaymentMethods() {
  const response = await getPaymentMethods();
  console.log('Payment methods response:', response);
  const paymentMethods = response.payment_methods || [];
  console.log('Payment methods:', paymentMethods);
  let created = 0;

  for (const method of paymentMethods) {
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
        console.error(`Failed to sync payment method ${method.id}:`, error.message);
      } else {
        toast.error(`Failed to sync payment method ${method.id}: ${error}`);
        console.error(`Failed to sync payment method ${method.id}:`, error);
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