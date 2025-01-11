import { useState, useEffect } from 'react';
import pb from '@/app/lib/pocketbase';
import { 
  DeliveryOptionsResponse, 
  PaymentMethodsResponse, 
  SourcesResponse, 
  StatusResponse 
} from '@/app/types/pocketbase-types';

export function useEntities() {
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryOptionsResponse[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsResponse[]>([]);
  const [sources, setSources] = useState<SourcesResponse[]>([]);
  const [statuses, setStatuses] = useState<StatusResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        setIsLoading(true);
        const [
          deliveryMethodsData,
          paymentMethodsData,
          sourcesData,
          statusesData
        ] = await Promise.all([
          pb.collection('delivery_options').getFullList<DeliveryOptionsResponse>(),
          pb.collection('payment_options').getFullList<PaymentMethodsResponse>(),
          pb.collection('sources').getFullList<SourcesResponse>(),
          pb.collection('status_options').getFullList<StatusResponse>()
        ]);

        setDeliveryMethods(deliveryMethodsData);
        setPaymentMethods(paymentMethodsData);
        setSources(sourcesData);
        setStatuses(statusesData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch entities'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntities();
  }, []);

  const refreshEntities = async () => {
    setIsLoading(true);
    try {
      const [
        deliveryMethodsData,
        paymentMethodsData,
        sourcesData,
        statusesData
      ] = await Promise.all([
        pb.collection('delivery_options').getFullList<DeliveryOptionsResponse>(),
        pb.collection('payment_options').getFullList<PaymentMethodsResponse>(),
        pb.collection('sources').getFullList<SourcesResponse>(),
        pb.collection('status_options').getFullList<StatusResponse>()
      ]);

      setDeliveryMethods(deliveryMethodsData);
      setPaymentMethods(paymentMethodsData);
      setSources(sourcesData);
      setStatuses(statusesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch entities'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    deliveryMethods: deliveryMethods as DeliveryOptionsResponse[],
    paymentMethods: paymentMethods as PaymentMethodsResponse[],
    sources: sources as SourcesResponse[],
    statuses: statuses as StatusResponse[],
    isLoading,
    error,
    refreshEntities
  };
} 