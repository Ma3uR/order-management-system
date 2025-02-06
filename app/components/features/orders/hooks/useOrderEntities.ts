import { useState, useEffect } from 'react';
import pb from '@/app/lib/pocketbase';
import { DeliveryOptionsResponse, PaymentOptionsRecord, SourcesResponse, StatusResponse } from '@/app/types/pocketbase-types';

export function useOrderEntities() {
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryOptionsResponse[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentOptionsRecord[]>([]);
  const [sources, setSources] = useState<SourcesResponse[]>([]);
  const [statuses, setStatuses] = useState<StatusResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
        pb.collection('payment_options').getFullList<PaymentOptionsRecord>(),
        pb.collection('sources').getFullList<SourcesResponse>(),
        pb.collection('status_options').getFullList<StatusResponse>()
      ]);

      setDeliveryMethods(deliveryMethodsData);
      setPaymentMethods(paymentMethodsData);
      setSources(sourcesData);
      setStatuses(statusesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch order entities'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  return {
    deliveryMethods,
    paymentMethods,
    sources,
    statuses,
    isLoading,
    error,
    refreshEntities: fetchEntities
  };
} 