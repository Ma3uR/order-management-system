"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  X,
  ChevronDown
} from 'lucide-react';

import { Input } from '@/app/components/shared/ui/input';
import { Button } from '@/app/components/shared/ui/button';
import { Badge } from '@/app/components/shared/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/shared/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/shared/ui/popover';
import { Checkbox } from '@/app/components/shared/ui/checkbox';
import { Label } from '@/app/components/shared/ui/label';
import { Separator } from '@/app/components/shared/ui/separator';

import { 
  type BlacklistFilters as BlacklistFiltersType, 
  type SortConfig,
  SortOption
} from '@/app/lib/validations/blacklist';

interface BlacklistFiltersProps {
  filters: BlacklistFiltersType;
  onFiltersChange: (filters: BlacklistFiltersType) => void;
  sortConfig: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  isLoading: boolean;
}

const filterVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const chipVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
  transition: { type: "spring", stiffness: 500, damping: 30 }
};

export function BlacklistFilters({
  filters,
  onFiltersChange,
  sortConfig,
  onSortChange,
  isLoading
}: BlacklistFiltersProps) {
  const t = useTranslations('Blacklist');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };



  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      dateRange: {},
      orderSumRange: {},
      showExpired: true
    });
  };

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case SortOption.DATE_DESC: return t('sortByDateDesc');
      case SortOption.DATE_ASC: return t('sortByDateAsc');
      case SortOption.NAME_ASC: return t('sortByNameAsc');
      case SortOption.NAME_DESC: return t('sortByNameDesc');
      case SortOption.ORDER_SUM_DESC: return t('sortByOrderSumDesc');
      case SortOption.ORDER_SUM_ASC: return t('sortByOrderSumAsc');
      default: return t('sortByDateDesc');
    }
  };



  const activeFilterCount = 
    (filters.search ? 1 : 0);

  return (
    <motion.div
      variants={filterVariants}
      className="space-y-4"
    >
      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 h-10"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>

        {/* Sort */}
        <Select
          value={sortConfig.field}
          onValueChange={(value: SortOption) => 
            onSortChange({ ...sortConfig, field: value })
          }
        >
          <SelectTrigger className="w-full sm:w-[200px] h-10">
            <div className="flex items-center gap-2">
              {sortConfig.direction === 'asc' ? 
                <SortAsc className="h-4 w-4" /> : 
                <SortDesc className="h-4 w-4" />
              }
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.values(SortOption).map((option) => (
              <SelectItem key={option} value={option}>
                {getSortLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filters Toggle */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative h-10">
              <Filter className="h-4 w-4 mr-2" />
              {t('filters')}
              {activeFilterCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('advancedFilters')}</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 px-2"
                  >
                    {t('clearAll')}
                  </Button>
                )}
              </div>

              <Separator />

              {/* Show Expired Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-expired"
                  checked={filters.showExpired}
                  onCheckedChange={(checked) => 
                    onFiltersChange({ ...filters, showExpired: Boolean(checked) })
                  }
                />
                <Label htmlFor="show-expired" className="text-sm cursor-pointer">
                  {t('showExpired')}
                </Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filter Chips */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {/* Search chip */}
            {filters.search && (
              <motion.div variants={chipVariants}>
                <Badge variant="secondary" className="gap-1">
                  <Search className="h-3 w-3" />
                  {filters.search}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleSearchChange('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </motion.div>
            )}


          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}