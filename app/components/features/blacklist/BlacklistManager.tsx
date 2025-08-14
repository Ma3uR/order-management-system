"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/app/hooks/useSession';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { createBlackList, deleteBlackList, getBlackListPaginated } from '@/app/[locale]/blacklist/actions/black-list';
import { toast } from 'sonner';
import { useDebounce } from '@/app/hooks/useDebounce';

import type { BlacklistEntriesResponse } from '@/app/types/pocketbase-types';
import { 
  type BlacklistFormData, 
  type BlacklistFilters, 
  type EnhancedBlacklistEntry,
  type BulkOperation,
  ViewMode,
  type SortConfig,
  SortOption,
  type PaginationInfo
} from '@/app/lib/validations/blacklist';

import { BlacklistHeader } from './BlacklistHeader';
import { BlacklistFilters as BlacklistFiltersComponent } from './BlacklistFilters';
import { BlacklistGrid } from './BlacklistGrid';
import { BlacklistForm } from './BlacklistForm';
import { BulkActions } from './BulkActions';
import { ExportDialog } from './ExportDialog';
import { EmptyState } from './EmptyState';

const containerVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  },
  exit: { opacity: 0 }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export default function BlacklistManager() {
  const router = useRouter();
  const t = useTranslations('Blacklist');
  const { isAuthenticated, isLoading: sessionLoading } = useSession();

  // Detect if mobile for default view
  const getDefaultViewMode = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? ViewMode.CARD : ViewMode.TABLE;
    }
    return ViewMode.TABLE;
  };

  // Core state
  const [items, setItems] = useState<EnhancedBlacklistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>(getDefaultViewMode());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters and search
  const [filters, setFilters] = useState<BlacklistFilters>({
    search: '',
    dateRange: {},
    orderSumRange: {},
    showExpired: true
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  // Sorting and pagination
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: SortOption.DATE_DESC,
    direction: 'desc'
  });

  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    perPage: 12,
    totalItems: 0,
    totalPages: 0
  });

  // Enhanced blacklist entry helper
  const enhanceBlacklistEntry = useCallback((item: BlacklistEntriesResponse): EnhancedBlacklistEntry => {
    const now = new Date();
    
    return {
      ...item,
      expiryDate: (item as BlacklistEntriesResponse & { expiryDate?: string }).expiryDate,
      isExpired: (item as BlacklistEntriesResponse & { expiryDate?: string }).expiryDate ? new Date((item as BlacklistEntriesResponse & { expiryDate?: string }).expiryDate as string) < now : false
    };
  }, []);

  // Fetch blacklist with filters
  const fetchBlacklist = useCallback(async (page: number, currentFilters: BlacklistFilters, sort: SortConfig) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await getBlackListPaginated(page, pagination.perPage, currentFilters.search);
      const data = response.data;
      
      if (!data) {
        setItems([]);
      } else {
        const enhancedItems = data.items.map(enhanceBlacklistEntry);
        
        // Apply client-side filtering (until backend supports it)
        let filteredItems = enhancedItems;
        
        if (!currentFilters.showExpired) {
          filteredItems = filteredItems.filter(item => !item.isExpired);
        }
        
        // Apply sorting
        filteredItems.sort((a, b) => {
          const direction = sort.direction === 'asc' ? 1 : -1;
          
          switch (sort.field) {
            case SortOption.NAME_ASC:
            case SortOption.NAME_DESC:
              return (a.fullName || '').localeCompare(b.fullName || '') * direction;
            case SortOption.DATE_ASC:
            case SortOption.DATE_DESC:
              return (new Date(a.created).getTime() - new Date(b.created).getTime()) * direction;
            case SortOption.ORDER_SUM_ASC:
            case SortOption.ORDER_SUM_DESC:
              return ((a.totalOrderSum || 0) - (b.totalOrderSum || 0)) * direction;
            default:
              return 0;
          }
        });
        
        setItems(filteredItems);
      }
      
      setPagination(prev => ({
        ...prev,
        page: data?.page || 1,
        totalItems: data?.totalItems || 0,
        totalPages: data?.totalPages || 0
      }));
    } catch (error: unknown) {
      console.error('Error fetching blacklist:', error);
      setError(error instanceof Error ? error.message : t('error'));
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.perPage, enhanceBlacklistEntry, t]);

  // Auth check
  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, sessionLoading, router]);

  // Fetch data when filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchBlacklist(pagination.page, filters, sortConfig);
    }
  }, [isAuthenticated, pagination.page, debouncedSearch, fetchBlacklist, filters, sortConfig]);

  // Handle responsive view mode
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      // Only auto-switch to card view on mobile if currently in table view
      if (isMobile && viewMode === ViewMode.TABLE) {
        setViewMode(ViewMode.CARD);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [viewMode]);

  // Handlers
  const handleAddItem = async (data: BlacklistFormData) => {
    try {
      setIsLoading(true);
      const result = await createBlackList(data);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        const enhancedItem = enhanceBlacklistEntry(result.data as BlacklistEntriesResponse);
        setItems(prev => [enhancedItem, ...prev]);
        toast.success(t('addSuccess'), {
          duration: 4000,
          position: "top-right",
          dismissible: true
        });
        setIsFormOpen(false);
        await fetchBlacklist(pagination.page, filters, sortConfig);
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

  const handleRemoveItems = async (ids: string[]) => {
    try {
      const results = await Promise.all(ids.map(id => deleteBlackList(id)));
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} items`);
      }

      setItems(prev => prev.filter(item => !ids.includes(item.id)));
      setSelectedIds(new Set());
      toast.success(
        ids.length === 1 ? t('removeSuccess') : t('bulkRemoveSuccess', { count: ids.length }),
        {
          duration: 4000,
          position: "top-right",
          dismissible: true
        }
      );
    } catch (error) {
      toast.error(t('removeError'), {
        duration: 4000,
        position: "top-right",
        dismissible: true
      });
      console.error('Error removing blacklist entries:', error);
    }
  };

  const handleBulkOperation = async (operation: BulkOperation) => {
    switch (operation.type) {
      case 'delete':
        await handleRemoveItems(operation.selectedIds);
        break;
      case 'export':
        setIsExportOpen(true);
        break;
      // TODO: Implement bulk updates when backend supports it
      default:
        toast.info(t('featureComingSoon'));
    }
  };

  const handleFiltersChange = (newFilters: BlacklistFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (newSort: SortConfig) => {
    setSortConfig(newSort);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSelectionChange = (newSelection: Set<string>) => {
    setSelectedIds(newSelection);
  };

  if (sessionLoading) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-[400px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div variants={itemVariants}>
        <BlacklistHeader
          onAddClick={() => setIsFormOpen(true)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedCount={selectedIds.size}
          totalCount={items.length}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <BlacklistFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
          isLoading={isLoading}
        />
      </motion.div>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            variants={itemVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <BulkActions
              selectedCount={selectedIds.size}
              onBulkOperation={handleBulkOperation}
              onClearSelection={() => setSelectedIds(new Set())}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants}>
        {error ? (
          <div className="flex items-center justify-center p-8 text-destructive">
            <p>{error}</p>
          </div>
        ) : items.length === 0 && !isLoading ? (
          <EmptyState 
            onAddClick={() => setIsFormOpen(true)}
            hasFilters={Object.values(filters).some(v => 
              Array.isArray(v) ? v.length > 0 : Boolean(v)
            )}
          />
        ) : (
          <BlacklistGrid
            items={items}
            viewMode={viewMode}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onRemoveItem={(id) => handleRemoveItems([id])}
            pagination={pagination}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        )}
      </motion.div>

      {/* Modals */}
      <BlacklistForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddItem}
        isLoading={isLoading}
      />

      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        items={selectedIds.size > 0 ? items.filter(item => selectedIds.has(item.id)) : items}
      />
    </motion.div>
  );
}