"use client";

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Trash2, 
  Download, 
  X
} from 'lucide-react';

import { Button } from '@/app/components/shared/ui/button';
import { Card, CardContent } from '@/app/components/shared/ui/card';
import { Badge } from '@/app/components/shared/ui/badge';

import type { BulkOperation } from '@/app/lib/validations/blacklist';

interface BulkActionsProps {
  selectedCount: number;
  onBulkOperation: (operation: BulkOperation) => void;
  onClearSelection: () => void;
}

const containerVariants = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    y: 50, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

export function BulkActions({
  selectedCount,
  onBulkOperation,
  onClearSelection
}: BulkActionsProps) {
  const t = useTranslations('Blacklist');

  const handleDelete = () => {
    onBulkOperation({
      type: 'delete',
      selectedIds: [] // This will be populated by the parent component
    });
  };

  const handleExport = () => {
    onBulkOperation({
      type: 'export',
      selectedIds: [],
      payload: {
        format: 'csv'
      }
    });
  };



  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <Card className="shadow-lg border-2 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Selection Info */}
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-medium">
                {selectedCount} {t('selected')}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              {/* Delete */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('delete')}
              </Button>

              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-8"
              >
                <Download className="h-4 w-4 mr-1" />
                {t('export')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}