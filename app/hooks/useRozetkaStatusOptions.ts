'use client';

import { useState, useEffect } from 'react';
import { getAvailableStatusesForOrder } from '@/app/actions/rozetka';

interface RozetkaStatusOption {
  id: number;
  name: string;
  name_uk: string;
  status: number;
  color: string;
}

export function useRozetkaStatusOptions(orderNumber: string | null, isRozetka: boolean) {
  const [rozetkaStatuses, setRozetkaStatuses] = useState<RozetkaStatusOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isRozetka || !orderNumber) {
      setRozetkaStatuses([]);
      setError(null);
      return;
    }

    const fetchRozetkaStatuses = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`🔍 [HOOK DEBUG] Fetching Rozetka statuses for order: ${orderNumber}`);
        const result = await getAvailableStatusesForOrder(orderNumber);
        
        console.log(`🔍 [HOOK DEBUG] API result:`, {
          hasResult: !!result,
          hasError: !!(result?.error),
          hasData: !!(result?.data),
          dataLength: result?.data?.length || 0,
          error: result?.error
        });
        
        if (result && result.error) {
          console.warn('🚨 [HOOK DEBUG] Rozetka status API error:', result.error);
          setError(result.error);
          setRozetkaStatuses([]);
        } else if (result && result.data) {
          console.log(`✅ [HOOK DEBUG] Successfully loaded ${result.data.length} Rozetka statuses`);
          console.log(`🔍 [HOOK DEBUG] Sample statuses:`, result.data.slice(0, 2));
          setRozetkaStatuses(result.data);
        } else {
          console.warn('🚨 [HOOK DEBUG] Unexpected result from Rozetka status API:', result);
          setError('Unexpected response format');
          setRozetkaStatuses([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Rozetka statuses';
        console.error('❌ [HOOK DEBUG] Error fetching Rozetka statuses:', err);
        setError(errorMessage);
        setRozetkaStatuses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRozetkaStatuses();
  }, [orderNumber, isRozetka]);

  return {
    rozetkaStatuses,
    loading,
    error,
    hasRozetkaStatuses: rozetkaStatuses.length > 0
  };
}