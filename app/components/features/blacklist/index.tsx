"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/app/hooks/useSession';
import { useTranslations } from 'next-intl';
import { createBlackList, deleteBlackList, getBlackListPaginated } from '@/app/[locale]/blacklist/actions/black-list';
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
  const { isAuthenticated, isLoading: sessionLoading } = useSession();

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
    if (!sessionLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, sessionLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('Authenticated, fetching blacklist...');
      fetchBlacklist(pagination.page, debouncedSearch);
    }
  }, [isAuthenticated, pagination.page, fetchBlacklist, debouncedSearch]);

  useEffect(() => {
    if (isAuthenticated && !searchQuery) {
      fetchBlacklist(pagination.page, '');
    }
  }, [isAuthenticated, pagination.page, fetchBlacklist, searchQuery]);

  const handleAddItem = async (data: BlacklistFormData) => {
    try {
      setIsLoading(true);
      const result = await createBlackList(data);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        setItems(prev => [...prev, result.data as BlacklistEntriesResponse]);
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

  if (sessionLoading || isLoading) {
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
          <CardHeader className="px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="text-sm sm:text-base">{t('search')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-6 px-3 py-3 sm:px-4 sm:py-4">
            <div className="space-y-2 sm:space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  className="pl-7 sm:pl-8 w-full text-xs sm:text-sm h-8 sm:h-9"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {isSearching && (
                  <div className="absolute right-2 top-2.5">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 sm:space-y-4">
              <Collapsible
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                className="space-y-2"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-1.5 sm:p-2 rounded-md">
                    <h3 className="text-sm sm:text-base font-medium">{t('addNewItem')}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 sm:w-9 p-0 h-7 sm:h-9"
                    >
                      {isFormOpen ? (
                        <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                      <span className="sr-only">Toggle form</span>
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 sm:space-y-4">
                  <div className="rounded-md">
                    <BlacklistForm 
                      onSubmit={handleAddItem} 
                      isLoading={isLoading}
                      isOpen={isFormOpen}
                      onClose={() => setIsFormOpen(false)}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeIn}>
        <Card className="border bg-card">
          <CardHeader className="px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="text-sm sm:text-base">{t('blacklistItems')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-22rem)] sm:h-[calc(100vh-24rem)]">
              <div className="p-2 sm:p-4">
                <AnimatePresence mode="popLayout">
                  {error ? (
                    <motion.div 
                      className="flex items-center justify-center p-2 sm:p-4 text-destructive text-xs sm:text-sm"
                      variants={fadeIn}
                    >
                      <p>{error}</p>
                    </motion.div>
                  ) : items.length === 0 ? (
                    <motion.div 
                      className="flex items-center justify-center p-2 sm:p-4 text-muted-foreground text-xs sm:text-sm"
                      variants={fadeIn}
                    >
                      <p>{t('noItems')}</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="space-y-1.5 sm:space-y-2"
                      variants={staggerContainer}
                    >
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          variants={listItem}
                          layout
                          className="flex items-center justify-between p-2 sm:p-4 rounded-lg border hover:bg-accent/50"
                        >
                          <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1 overflow-hidden">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <p className="text-xs sm:text-sm font-medium truncate">{item.fullName}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{new Date(item.created).toLocaleDateString()}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
                              <p className="flex items-center gap-1 sm:gap-2 overflow-hidden">
                                <span className="font-medium shrink-0">Phone:</span> 
                                <span className="truncate">{item.phoneNumber}</span>
                              </p>
                              <p className="flex items-center gap-1 sm:gap-2 overflow-hidden">
                                <span className="font-medium shrink-0">City:</span> 
                                <span className="truncate">{item.city}</span>
                              </p>
                              {item.totalOrderSum && (
                                <p className="flex items-center gap-1 sm:gap-2">
                                  <span className="font-medium shrink-0">Total Orders:</span> {item.totalOrderSum}
                                </p>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-[10px] sm:text-sm text-muted-foreground mt-1 sm:mt-2 line-clamp-2 sm:line-clamp-none">
                                <span className="font-medium">Notes:</span> {item.notes}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="ml-2 sm:ml-4 h-6 w-6 sm:h-8 sm:w-8 shrink-0"
                          >
                            <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
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
            <CardContent className="p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 text-[10px] sm:text-sm text-muted-foreground">
                  {t('showing')} {((pagination.page - 1) * pagination.perPage) + 1}-
                  {Math.min(pagination.page * pagination.perPage, pagination.totalItems)} {t('of')}{' '}
                  {pagination.totalItems} {t('entries')}
                </div>
                <div className="flex items-center gap-0.5 sm:gap-2 flex-wrap justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                    className="h-6 sm:h-8 text-[10px] sm:text-xs px-1 sm:px-2"
                  >
                    {t('firstPage')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="h-6 sm:h-8 text-[10px] sm:text-xs px-1 sm:px-2"
                  >
                    {t('previousPage')}
                  </Button>
                  <div className="flex items-center gap-0.5 sm:gap-1">
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
                          className="w-6 h-6 sm:w-8 sm:h-8 text-[10px] sm:text-xs p-0"
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
                    className="h-6 sm:h-8 text-[10px] sm:text-xs px-1 sm:px-2"
                  >
                    {t('nextPage')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.page === pagination.totalPages}
                    className="h-6 sm:h-8 text-[10px] sm:text-xs px-1 sm:px-2"
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
