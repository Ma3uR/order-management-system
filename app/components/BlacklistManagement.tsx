"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useTranslations } from 'next-intl';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface BlacklistItem {
  id: string | number;
  fullName: string;
  phoneNumber: string;
  city: string;
  totalOrderSum: number;
  notes: string;
}

interface PaginationInfo {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

const ITEMS_PER_PAGE = 10;

const BlacklistManagement: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin');
    },
  });
  
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    perPage: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 0
  });
  const [newItem, setNewItem] = useState({ 
    fullName: '', 
    phoneNumber: '', 
    city: '',
    totalOrderSum: 0,
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('Blacklist');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBlacklist(pagination.page);
    }
  }, [status, pagination.page]);

  const fetchBlacklist = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`/api/blacklist?page=${page}&perPage=${ITEMS_PER_PAGE}`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      setBlacklist(response.data.items);
      setPagination({
        page,
        perPage: ITEMS_PER_PAGE,
        totalItems: response.data.totalItems,
        totalPages: response.data.totalPages
      });
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

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
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
        setNewItem({ fullName: '', phoneNumber: '', city: '', totalOrderSum: 0, notes: '' });
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

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={pagination.page === i ? "default" : "ghost"}
          onClick={() => handlePageChange(i)}
          className="mx-1"
        >
          {i}
        </Button>
      );
    }

    return (
      <div className="flex justify-center items-center gap-2 mt-4">
        <Button
          variant="ghost"
          onClick={() => handlePageChange(1)}
          disabled={pagination.page === 1}
          title={t('firstPage')}
        >
          «
        </Button>
        <Button
          variant="ghost"
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          title={t('previousPage')}
        >
          ‹
        </Button>
        {pages}
        <Button
          variant="ghost"
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
          title={t('nextPage')}
        >
          ›
        </Button>
        <Button
          variant="ghost"
          onClick={() => handlePageChange(pagination.totalPages)}
          disabled={pagination.page === pagination.totalPages}
          title={t('lastPage')}
        >
          »
        </Button>
      </div>
    );
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
          <Button variant="default">{t('backToDashboard')}</Button>
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          type="text"
          name="fullName"
          value={newItem.fullName}
          onChange={handleInputChange}
          placeholder={t('fullNamePlaceholder')}
          className="flex-1"
        />
        <Input
          type="text"
          name="phoneNumber"
          value={newItem.phoneNumber}
          onChange={handleInputChange}
          placeholder={t('phoneNumberPlaceholder')}
          className="flex-1"
        />
        <Input
          type="text"
          name="city"
          value={newItem.city}
          onChange={handleInputChange}
          placeholder={t('cityPlaceholder')}
          className="flex-1"
        />
        <Input
          type="number"
          name="totalOrderSum"
          value={newItem.totalOrderSum}
          onChange={handleInputChange}
          placeholder={t('totalOrderSumPlaceholder')}
          className="flex-1"
        />
        <Input
          type="text"
          name="notes"
          value={newItem.notes}
          onChange={handleInputChange}
          placeholder={t('notesPlaceholder')}
          className="flex-1"
        />
        <Button onClick={handleAddItem} disabled={isLoading}>
          {isLoading ? t('adding') : t('addToBlacklist')}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">{t('loading')}</div>
      ) : blacklist.length === 0 ? (
        <div className="text-center py-4 text-gray-500">{t('noEntries')}</div>
      ) : (
        <>
          <ul className="space-y-2">
            {blacklist.map(item => (
              <li key={item.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                <div className="flex flex-col">
                  <span className="font-medium">{item.fullName} - {item.phoneNumber}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.city} • {t('orderSum')}: ₴{item.totalOrderSum}
                  </span>
                  {item.notes && <span className="text-sm italic">{item.notes}</span>}
                </div>
                <Button 
                  onClick={() => handleRemoveItem(item.id)} 
                  variant="default" 
                  className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
                >
                  {t('remove')}
                </Button>
              </li>
            ))}
          </ul>
          {renderPagination()}
          <div className="text-center text-sm text-gray-500 mt-2">
            {t('showing')} {(pagination.page - 1) * pagination.perPage + 1} - {Math.min(pagination.page * pagination.perPage, pagination.totalItems)} {t('of')} {pagination.totalItems} {t('entries')}
          </div>
        </>
      )}
    </div>
  );
};

export default BlacklistManagement;
