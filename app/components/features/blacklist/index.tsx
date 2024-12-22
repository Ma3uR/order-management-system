"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import axios, { AxiosError } from 'axios';
import { BlacklistForm } from './BlacklistForm';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import type { BlacklistEntriesResponse } from '@/app/types/pocketbase-types';
import type { BlacklistFormData } from '@/app/lib/validations/blacklist';
import { Trash } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { useDebounce } from '@/app/hooks/useDebounce';
interface PaginationInfo {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export default function BlacklistManagement() {
  const router = useRouter();
  const t = useTranslations('Blacklist');
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin');
    },
  });

  const [items, setItems] = useState<BlacklistEntriesResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    perPage: 10,
    totalItems: 0,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [isSearching, setIsSearching] = useState(false);

  const fetchBlacklist = useCallback(async (page: number, searchTerm: string) => {
    try {
      setIsSearching(true);
      const response = await axios.get(`/api/blacklist?page=${page}&perPage=${pagination.perPage}&search=${searchTerm}`);
      setItems(response.data.items);
      setPagination({
        page: response.data.page,
        perPage: response.data.perPage,
        totalItems: response.data.totalItems,
        totalPages: response.data.totalPages
      });
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || t('error'));
      } else {
        toast.error(t('error'));
      }
    } finally {
      setIsSearching(false);
    }
  }, [pagination.perPage, t]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBlacklist(pagination.page, debouncedSearch);
    }
  }, [status, pagination.page, fetchBlacklist, debouncedSearch]);

  useEffect(() => {
    if (status === 'authenticated' && !searchQuery) {
      fetchBlacklist(pagination.page, '');
    }
  }, [status, pagination.page, fetchBlacklist, searchQuery]);

  const handleAddItem = async (data: BlacklistFormData) => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/blacklist', data);
      setItems(prev => [...prev, response.data]);
      toast.success(t('addSuccess'), {
        className: "bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800",
        style: {
          color: "var(--foreground)",
        },
        duration: 4000,
        position: "top-right",
        dismissible: true
      });
      await fetchBlacklist(pagination.page, '');
    } catch (error) {
      toast.error(t('addError'), {
        className: "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800",
        style: {
          color: "var(--foreground)",
        },
        duration: 4000,
        position: "top-right",
        dismissible: true
      });
      console.error('Error adding blacklist entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      await axios.delete('/api/blacklist', { data: { id } });
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success(t('removeSuccess'), {
        className: "bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800",
        style: {
          color: "var(--foreground)",
        },
        duration: 4000,
        position: "top-right",
        dismissible: true
      });
    } catch (error) {
      toast.error(t('removeError'), {
        className: "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800",
        style: {
          color: "var(--foreground)",
        },
        duration: 4000,
        position: "top-right",
        dismissible: true
      });
      console.error('Error removing blacklist entry:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card className="bg-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-8 w-full bg-background"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {isSearching && (
                <div className="absolute right-2 top-2.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BlacklistForm onSubmit={handleAddItem} isLoading={isLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noEntries')}
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-medium">{item.fullName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.phoneNumber} • {item.city}
                        </p>
                        {item.totalOrderSum && (
                          <p className="text-sm">
                            {t('orderSum')}: ₴{item.totalOrderSum}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-sm italic text-muted-foreground">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

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

      <div className="text-center text-sm text-gray-500 mt-2">
        {t('showing')} {(pagination.page - 1) * pagination.perPage + 1} - {Math.min(pagination.page * pagination.perPage, pagination.totalItems)} {t('of')} {pagination.totalItems} {t('entries')}
      </div>
    </div>
  );
}
