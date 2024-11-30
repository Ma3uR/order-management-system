"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface BlacklistItem {
  id: string | number;
  fullName: string;
  phoneNumber: string;
}

const BlacklistManagement: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin');
    },
  });
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [newItem, setNewItem] = useState({ fullName: '', phoneNumber: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('Blacklist');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBlacklist();
    }
  }, [status]);

  const fetchBlacklist = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get('/api/blacklist', {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      setBlacklist(response.data);
    } catch (error: any) {
      console.error('Error fetching blacklist:', error);
      if (error?.response?.status === 401) {
        router.push('/auth/signin');
        return;
      }
      setError(error?.response?.data?.error || 'Failed to fetch blacklist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async () => {
    if (newItem.fullName && newItem.phoneNumber) {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.post('/api/blacklist', newItem, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        setBlacklist(prev => [...prev, response.data]);
        setNewItem({ fullName: '', phoneNumber: '' });
      } catch (error: any) {
        if (error?.response?.status === 401) {
          router.push('/auth/signin');
          return;
        }
        setError(error?.response?.data?.error || 'Failed to add item to blacklist');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRemoveItem = async (id: string | number) => {
    try {
      await axios.delete('/api/blacklist', { 
        data: { id },
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      setBlacklist(prev => prev.filter(item => item.id !== id));
    } catch (error: any) {
      console.error('Error removing item from blacklist:', error);
      setError(`Failed to remove item from blacklist: ${error.response?.data?.details || error.message}`);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center py-4">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href="/dashboard">
          <Button variant="outline">{t('backToDashboard')}</Button>
        </Link>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="flex space-x-2">
        <Input
          type="text"
          name="fullName"
          value={newItem.fullName}
          onChange={handleInputChange}
          placeholder={t('fullNamePlaceholder')}
        />
        <Input
          type="text"
          name="phoneNumber"
          value={newItem.phoneNumber}
          onChange={handleInputChange}
          placeholder={t('phoneNumberPlaceholder')}
        />
        <Button onClick={handleAddItem} disabled={isLoading}>
          {isLoading ? t('adding') : t('addToBlacklist')}
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : blacklist.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No entries in blacklist</div>
      ) : (
        <ul className="space-y-2">
          {blacklist.map(item => (
            <li key={item.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
              <span>{item.fullName} - {item.phoneNumber}</span>
              <Button 
                onClick={() => handleRemoveItem(item.id)} 
                variant="outline" 
                className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
              >
                {t('remove')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BlacklistManagement;
