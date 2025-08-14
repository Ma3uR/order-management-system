"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/app/components/shared/ui/checkbox';
import { Button } from '@/app/components/shared/ui/button';
import { Card, CardContent } from '@/app/components/shared/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/shared/ui/table';

import { 
  type EnhancedBlacklistEntry, 
  ViewMode, 
  type PaginationInfo
} from '@/app/lib/validations/blacklist';

import { BlacklistCard } from './BlacklistCard';

interface BlacklistGridProps {
  items: EnhancedBlacklistEntry[];
  viewMode: ViewMode;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onRemoveItem: (id: string) => void;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

const gridVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const loadingVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export function BlacklistGrid({
  items,
  viewMode,
  selectedIds,
  onSelectionChange,
  onRemoveItem,
  pagination,
  onPageChange,
  isLoading
}: BlacklistGridProps) {
  const t = useTranslations('Blacklist');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(items.map(item => item.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleItemSelection = (itemId: string, selected: boolean) => {
    const newSelection = new Set(selectedIds);
    if (selected) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    onSelectionChange(newSelection);
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH'
    }).format(amount);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <motion.div
        variants={loadingVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {viewMode === ViewMode.CARD ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('phone')}</TableHead>
                    <TableHead>{t('city')}</TableHead>
                    <TableHead>{t('created')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><div className="h-4 bg-muted rounded w-4"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-24"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16"></div></TableCell>
                      <TableCell><div className="h-6 bg-muted rounded w-12"></div></TableCell>
                      <TableCell><div className="h-6 bg-muted rounded w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-4"></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card View */}
      {viewMode === ViewMode.CARD && (
        <motion.div
          variants={gridVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <BlacklistCard
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onSelectionChange={(selected) => handleItemSelection(item.id, selected)}
                onRemove={() => onRemoveItem(item.id)}
                showSelection={selectedIds.size > 0 || items.length > 1}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Table View */}
      {viewMode === ViewMode.TABLE && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full overflow-x-auto border rounded-lg"
        >
          <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={items.length > 0 && selectedIds.size === items.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('phone')}</TableHead>
                    <TableHead>{t('city')}</TableHead>
                    <TableHead>{t('orderSum')}</TableHead>
                    <TableHead>{t('notes')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <TableRow
                        key={item.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${
                          selectedIds.has(item.id) ? 'bg-muted/30' : ''
                        } ${item.isExpired ? 'opacity-60' : ''}`}
                      >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={(checked) => 
                                handleItemSelection(item.id, Boolean(checked))
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.fullName || t('noName')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.phoneNumber || t('noPhone')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.city || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.totalOrderSum ? formatCurrency(item.totalOrderSum) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="max-w-xs truncate" title={item.notes || ''}>
                              {item.notes || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveItem(item.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <span className="sr-only">{t('remove')}</span>
                              🗑️
                            </Button>
                          </TableCell>
                        </TableRow>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
        </motion.div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {t('showing')} {((pagination.page - 1) * pagination.perPage) + 1}-
                  {Math.min(pagination.page * pagination.perPage, pagination.totalItems)} {t('of')}{' '}
                  {pagination.totalItems} {t('entries')}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    disabled={pagination.page === 1}
                  >
                    {t('firstPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page - 1)}
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
                          variant={pagination.page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    {t('nextPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.totalPages)}
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
    </div>
  );
}