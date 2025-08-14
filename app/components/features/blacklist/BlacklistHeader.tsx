"use client";

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Plus, Grid3X3, List, Users } from 'lucide-react';

import { Button } from '@/app/components/shared/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/shared/ui/tooltip';
import { Badge } from '@/app/components/shared/ui/badge';
import { ViewMode } from '@/app/lib/validations/blacklist';

interface BlacklistHeaderProps {
  onAddClick: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedCount: number;
  totalCount: number;
}

const headerVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  }
};

const statsVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      delay: 0.2,
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

export function BlacklistHeader({
  onAddClick,
  viewMode,
  onViewModeChange,
  selectedCount,
  totalCount
}: BlacklistHeaderProps) {
  const t = useTranslations('Blacklist');

  return (
    <motion.div
      variants={headerVariants}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 bg-card border rounded-lg shadow-sm"
    >
      {/* Title and Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
        </div>

        {/* Stats */}
        <motion.div variants={statsVariants} className="flex items-center gap-2">
          <Badge variant="secondary" className="font-medium">
            {totalCount} {t('totalEntries')}
          </Badge>
          {selectedCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Badge variant="default" className="font-medium">
                {selectedCount} {t('selected')}
              </Badge>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <TooltipProvider>
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === ViewMode.CARD ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange(ViewMode.CARD)}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('cardView')}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === ViewMode.TABLE ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange(ViewMode.TABLE)}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('tableView')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Add Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={onAddClick}
            className="h-9 px-4 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addToBlacklist')}
          </Button>
        </motion.div>

        {/* Mobile FAB for smaller screens */}
        <motion.div className="fixed bottom-6 right-6 z-50 sm:hidden">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 25,
              delay: 0.5 
            }}
          >
            <Button
              onClick={onAddClick}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}