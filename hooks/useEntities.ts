import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { DeliveryOptionsResponse, PaymentOptionsResponse, SourcesResponse, StatusOptionsResponse } from '@/types/pocketbase-types';

export function useEntities() {
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryOptionsResponse[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentOptionsResponse[]>([]);
  const [sources, setSources] = useState<SourcesResponse[]>([]);
  const [statuses, setStatuses] = useState<StatusOptionsResponse[]>([]);
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
          pb.collection('payment_options').getFullList<PaymentOptionsResponse>(),
          pb.collection('sources').getFullList<SourcesResponse>(),
          pb.collection('status_options').getFullList<StatusOptionsResponse>()
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
        pb.collection('payment_options').getFullList<PaymentOptionsResponse>(),
        pb.collection('sources').getFullList<SourcesResponse>(),
        pb.collection('status_options').getFullList<StatusOptionsResponse>()
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
    deliveryMethods,
    paymentMethods,
    sources,
    statuses,
    isLoading,
    error,
    refreshEntities
  };
} 