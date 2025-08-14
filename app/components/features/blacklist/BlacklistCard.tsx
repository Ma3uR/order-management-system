"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  MapPin, 
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';

import { Button } from '@/app/components/shared/ui/button';
import { Badge } from '@/app/components/shared/ui/badge';
import { Checkbox } from '@/app/components/shared/ui/checkbox';
import { Card, CardContent } from '@/app/components/shared/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/shared/ui/tooltip';

import type { EnhancedBlacklistEntry } from '@/app/lib/validations/blacklist';

interface BlacklistCardProps {
  item: EnhancedBlacklistEntry;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onRemove: () => void;
  showSelection: boolean;
}

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95,
    transition: {
      duration: 0.2
    }
  },
  hover: {
    y: -2,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

const detailsVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { 
    opacity: 1, 
    height: 'auto',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    height: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export function BlacklistCard({
  item,
  isSelected,
  onSelectionChange,
  onRemove,
  showSelection
}: BlacklistCardProps) {
  const t = useTranslations('Blacklist');
  const [isExpanded, setIsExpanded] = useState(false);



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH'
    }).format(amount);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      layout
    >
      <Card className={`relative overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'
      } ${item.isExpired ? 'opacity-75' : ''}`}>
        
        {/* Selection Overlay */}
        {showSelection && (
          <div className="absolute top-3 left-3 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              className="bg-background border-2"
            />
          </div>
        )}


        <CardContent className={`p-4 ${showSelection ? 'pt-6' : ''}`}>
          {/* Main Content */}
          <div className="space-y-3">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {item.fullName || t('noName')}
                  </h3>
                  {item.isExpired && (
                    <Badge variant="outline" className="text-xs">
                      {t('expired')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span className="truncate">{item.phoneNumber || t('noPhone')}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isExpanded ? t('hideDetails') : t('showDetails')}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('removeFromBlacklist')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Quick Info Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {item.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{item.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(item.created)}</span>
                </div>
              </div>

            </div>

            {/* Expandable Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  variants={detailsVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="border-t pt-3 mt-3 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {/* Order Sum */}
                    {item.totalOrderSum && item.totalOrderSum > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">{t('totalOrderSum')}:</span>
                          <span className="ml-1 font-medium">{formatCurrency(item.totalOrderSum)}</span>
                        </div>
                      </div>
                    )}


                    {/* Expiry Date */}
                    {item.expiryDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">{t('expiryDate')}:</span>
                          <span className={`ml-1 font-medium ${
                            item.isExpired ? 'text-destructive' : 'text-foreground'
                          }`}>
                            {formatDate(item.expiryDate)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{t('notes')}:</span>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-sm text-foreground">
                        {item.notes}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}