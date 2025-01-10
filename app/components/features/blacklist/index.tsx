"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { createBlackList, deleteBlackList, getBlackList, getBlackListPaginated } from '@/app/[locale]/blacklist/actions/black-list';
import { BlacklistForm } from './BlacklistForm';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { ScrollArea } from "@/app/components/shared/ui/scroll-area";
import { toast } from 'sonner';
import type { BlacklistEntriesResponse } from '@/app/types/pocketbase-types';
import type { BlacklistFormData } from '@/app/lib/validations/blacklist';
import { Trash, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from "@/app/components/shared/ui/input";
import { useDebounce } from '@/app/hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/shared/ui/collapsible";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.2 }
};

const listItem = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.2 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchBlacklist = useCallback(async (page: number, searchTerm: string) => {
    try {
      setIsSearching(true);
      setError(null);
      
      const response = await getBlackListPaginated(page, pagination.perPage, searchTerm);
      const data = response.data;
      if (!data) {
        console.warn('No items in response:', data);
        setItems([]);
      } else {
        setItems(data.items);
      }
      
      setPagination({
        page: data?.page || 1,
        perPage: data?.perPage || 10,
        totalItems: data?.totalItems || 0,
        totalPages: data?.totalPages || 0
      });
    } catch (error: unknown) {
      console.error('Error fetching blacklist:', error);
      setError(error instanceof Error ? error.message : t('error'));
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }, [pagination.perPage, t]);

  useEffect(() => {
    console.log('Session status:', status);
    if (status === 'authenticated') {
      console.log('Authenticated, fetching blacklist...');
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
      const result = await createBlackList(data);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        setItems(prev => [...prev, result.data]);
        toast.success(t('addSuccess'), {
          duration: 4000,
          position: "top-right",
          dismissible: true
        });
        await fetchBlacklist(pagination.page, '');
      }
    } catch (error) {
      toast.error(t('addError'), {
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
      const result = await deleteBlackList(id);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setItems(prev => prev.filter(item => item.id !== id));
      toast.success(t('removeSuccess'), {
        duration: 4000,
        position: "top-right",
        dismissible: true
      });
    } catch (error) {
      toast.error(t('removeError'), {
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
      <motion.div 
        className="flex items-center justify-center min-h-[200px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={fadeIn}>
        <Card className="border bg-card">
          <CardHeader>
            <CardTitle className="text-base">{t('search')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  className="pl-8 w-full"
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

            <div className="space-y-4">
              <Collapsible
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                className="space-y-2"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-2 rounded-md">
                    <h3 className="text-base font-medium">{t('addNewItem')}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-9 p-0"
                    >
                      {isFormOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="sr-only">Toggle form</span>
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  <div className="rounded-md">
                    <BlacklistForm onSubmit={handleAddItem} isLoading={isLoading} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeIn}>
        <Card className="border bg-card">
          <CardHeader>
            <CardTitle className="text-base">{t('blacklistItems')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-24rem)]">
              <div className="p-4">
                <AnimatePresence mode="popLayout">
                  {error ? (
                    <motion.div 
                      className="flex items-center justify-center p-4 text-destructive"
                      variants={fadeIn}
                    >
                      <p>{error}</p>
                    </motion.div>
                  ) : items.length === 0 ? (
                    <motion.div 
                      className="flex items-center justify-center p-4 text-muted-foreground"
                      variants={fadeIn}
                    >
                      <p>{t('noItems')}</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="space-y-2"
                      variants={staggerContainer}
                    >
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          variants={listItem}
                          layout
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50"
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{item.fullName}</p>
                              <p className="text-xs text-muted-foreground">{new Date(item.created).toLocaleDateString()}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <p className="flex items-center gap-2">
                                <span className="font-medium">Phone:</span> {item.phoneNumber}
                              </p>
                              <p className="flex items-center gap-2">
                                <span className="font-medium">City:</span> {item.city}
                              </p>
                              {item.totalOrderSum && (
                                <p className="flex items-center gap-2 col-span-2">
                                  <span className="font-medium">Total Orders:</span> {item.totalOrderSum}
                                </p>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                <span className="font-medium">Notes:</span> {item.notes}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="ml-4 h-8 w-8 shrink-0"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {items.length > 0 && (
        <motion.div variants={fadeIn}>
          <Card className="border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-sm text-muted-foreground">
                  {t('showing')} {((pagination.page - 1) * pagination.perPage) + 1}-
                  {Math.min(pagination.page * pagination.perPage, pagination.totalItems)} {t('of')}{' '}
                  {pagination.totalItems} {t('entries')}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                  >
                    {t('firstPage')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    {t('previousPage')}
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else {
                        if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    {t('nextPage')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    {t('lastPage')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
