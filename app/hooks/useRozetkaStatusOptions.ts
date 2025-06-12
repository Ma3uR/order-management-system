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

export function useRozetkaStatusOptions(marketplaceId: string | null, isRozetka: boolean) {
  const [rozetkaStatuses, setRozetkaStatuses] = useState<RozetkaStatusOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isRozetka || !marketplaceId) {
      setRozetkaStatuses([]);
      setError(null);
      return;
    }

    const fetchRozetkaStatuses = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await getAvailableStatusesForOrder(marketplaceId);
        
        if (result && result.error) {
          console.warn('Rozetka status API error:', result.error);
          setError(result.error);
          setRozetkaStatuses([]);
        } else if (result && result.data) {
          setRozetkaStatuses(result.data);
        } else {
          console.warn('Unexpected result from Rozetka status API:', result);
          setError('Unexpected response format');
          setRozetkaStatuses([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Rozetka statuses';
        console.error('Error fetching Rozetka statuses:', err);
        setError(errorMessage);
        setRozetkaStatuses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRozetkaStatuses();
  }, [marketplaceId, isRozetka]);

  return {
    rozetkaStatuses,
    loading,
    error,
    hasRozetkaStatuses: rozetkaStatuses.length > 0
  };
}