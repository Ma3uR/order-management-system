"use client";

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { UserX, Plus, Search, Filter } from 'lucide-react';

import { Button } from '@/app/components/shared/ui/button';
import { Card, CardContent } from '@/app/components/shared/ui/card';

interface EmptyStateProps {
  onAddClick: () => void;
  hasFilters: boolean;
}

const containerVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

const floatingVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export function EmptyState({ onAddClick, hasFilters }: EmptyStateProps) {
  const t = useTranslations('Blacklist');

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="flex items-center justify-center min-h-[400px] p-8"
    >
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <motion.div
            variants={itemVariants}
            className="space-y-6"
          >
            {/* Illustration */}
            <motion.div
              variants={floatingVariants}
              animate="animate"
              className="flex justify-center"
            >
              <div className="relative">
                <div className="p-6 bg-muted/50 rounded-full">
                  {hasFilters ? (
                    <Search className="h-12 w-12 text-muted-foreground" />
                  ) : (
                    <UserX className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                
                {/* Decorative elements */}
                <motion.div
                  className="absolute -top-1 -right-1 p-1 bg-background rounded-full shadow-sm border"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 15 }}
                >
                  {hasFilters ? (
                    <Filter className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Plus className="h-3 w-3 text-primary" />
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div variants={itemVariants} className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">
                {hasFilters ? t('noResultsFound') : t('noBlacklistEntries')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {hasFilters 
                  ? t('noResultsDescription')
                  : t('emptyStateDescription')
                }
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div variants={itemVariants} className="space-y-3">
              {!hasFilters && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={onAddClick}
                    className="w-full"
                    size="lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addFirstEntry')}
                  </Button>
                </motion.div>
              )}

              {/* Tips */}
              <motion.div 
                variants={itemVariants}
                className="pt-2 space-y-2"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {hasFilters ? t('suggestions') : t('quickTips')}
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {hasFilters ? (
                    <>
                      <p>• {t('tryDifferentKeywords')}</p>
                      <p>• {t('adjustFilters')}</p>
                      <p>• {t('clearAllFilters')}</p>
                    </>
                  ) : (
                    <>
                      <p>• {t('tip1')}</p>
                      <p>• {t('tip2')}</p>
                      <p>• {t('tip3')}</p>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Feature highlights for first-time users */}
            {!hasFilters && (
              <motion.div 
                variants={itemVariants}
                className="pt-4 border-t"
              >
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="space-y-1">
                    <div className="p-2 bg-primary/10 rounded-lg mx-auto w-fit">
                      <UserX className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs font-medium">{t('manageCustomers')}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="p-2 bg-primary/10 rounded-lg mx-auto w-fit">
                      <Filter className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs font-medium">{t('smartFiltering')}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="p-2 bg-primary/10 rounded-lg mx-auto w-fit">
                      <Search className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs font-medium">{t('quickSearch')}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}