"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Download, FileText, Table } from 'lucide-react';

import { Button } from '@/app/components/shared/ui/button';
import { Card, CardContent } from '@/app/components/shared/ui/card';
import { Badge } from '@/app/components/shared/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/app/components/shared/ui/radio-group';
import { Label } from '@/app/components/shared/ui/label';
import { Checkbox } from '@/app/components/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/shared/ui/dialog';

import type { EnhancedBlacklistEntry } from '@/app/lib/validations/blacklist';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: EnhancedBlacklistEntry[];
}

type ExportFormat = 'csv' | 'excel';

interface ExportOptions {
  format: ExportFormat;
  includeFields: {
    fullName: boolean;
    phoneNumber: boolean;
    city: boolean;
    totalOrderSum: boolean;
    notes: boolean;
    created: boolean;
    expiryDate: boolean;
  };
  includeHeaders: boolean;
}

const dialogVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

export function ExportDialog({
  isOpen,
  onClose,
  items
}: ExportDialogProps) {
  const t = useTranslations('Blacklist');
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeFields: {
      fullName: true,
      phoneNumber: true,
      city: true,
      totalOrderSum: true,
      notes: true,
      created: true,
      expiryDate: true,
    },
    includeHeaders: true,
  });

  const handleFieldToggle = (field: keyof ExportOptions['includeFields']) => {
    setExportOptions(prev => ({
      ...prev,
      includeFields: {
        ...prev.includeFields,
        [field]: !prev.includeFields[field]
      }
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(exportOptions.includeFields).every(Boolean);
    const newState = !allSelected;
    
    setExportOptions(prev => ({
      ...prev,
      includeFields: Object.keys(prev.includeFields).reduce((acc, key) => ({
        ...acc,
        [key]: newState
      }), {} as ExportOptions['includeFields'])
    }));
  };

  const generateCSV = (data: EnhancedBlacklistEntry[], options: ExportOptions): string => {
    const fields = Object.entries(options.includeFields)
      .filter(([, include]) => include)
      .map(([field]) => field);

    const headers = fields.map(field => {
      switch (field) {
        case 'fullName': return t('fullNamePlaceholder');
        case 'phoneNumber': return t('phoneNumberPlaceholder');
        case 'city': return t('cityPlaceholder');
        case 'totalOrderSum': return t('totalOrderSumPlaceholder');
        case 'notes': return t('notesPlaceholder');
        case 'created': return t('created');
        case 'expiryDate': return t('expiryDate');
        default: return field;
      }
    });

    const rows = data.map(item => 
      fields.map(field => {
        const value = item[field as keyof EnhancedBlacklistEntry];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
    );

    const csvContent = [
      ...(options.includeHeaders ? [headers] : []),
      ...rows
    ].map(row => row.join(',')).join('\n');

    return csvContent;
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const csvData = generateCSV(items, exportOptions);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `blacklist_export_${timestamp}.${exportOptions.format}`;
      link.setAttribute('download', filename);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFieldsCount = Object.values(exportOptions.includeFields).filter(Boolean).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[500px]">
            <motion.div
              variants={dialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{t('exportBlacklist')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {t('exportDescription')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Export Info */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{t('recordsToExport')}</p>
                        <p className="text-xs text-muted-foreground">
                          {items.length > 0 
                            ? t('selectedRecords', { count: items.length })
                            : t('allRecords')
                          }
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-medium">
                        {items.length} {t('records')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Format Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('exportFormat')}</Label>
                  <RadioGroup
                    value={exportOptions.format}
                    onValueChange={(value: ExportFormat) => 
                      setExportOptions(prev => ({ ...prev, format: value }))
                    }
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv" id="csv" />
                      <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="h-4 w-4" />
                        CSV
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="excel" id="excel" />
                      <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                        <Table className="h-4 w-4" />
                        Excel
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Field Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t('includeFields')}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-8 text-xs"
                    >
                      {selectedFieldsCount === Object.keys(exportOptions.includeFields).length 
                        ? t('deselectAll') 
                        : t('selectAll')
                      }
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {Object.entries(exportOptions.includeFields).map(([field, isIncluded]) => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox
                          id={field}
                          checked={isIncluded}
                          onCheckedChange={() => handleFieldToggle(field as keyof ExportOptions['includeFields'])}
                        />
                        <Label htmlFor={field} className="text-sm cursor-pointer">
                          {field === 'fullName' && t('fullNamePlaceholder')}
                          {field === 'phoneNumber' && t('phoneNumberPlaceholder')}
                          {field === 'city' && t('cityPlaceholder')}
                          {field === 'totalOrderSum' && t('totalOrderSumPlaceholder')}
                          {field === 'notes' && t('notesPlaceholder')}
                          {field === 'created' && t('created')}
                          {field === 'expiryDate' && t('expiryDate')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Include Headers */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-headers"
                    checked={exportOptions.includeHeaders}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeHeaders: Boolean(checked) }))
                    }
                  />
                  <Label htmlFor="include-headers" className="text-sm cursor-pointer">
                    {t('includeHeaders')}
                  </Label>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isExporting}
                    className="flex-1 sm:flex-none"
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    onClick={handleExport} 
                    disabled={isExporting || selectedFieldsCount === 0}
                    className="flex-1 sm:flex-none min-w-[120px]"
                  >
                    {isExporting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('exporting')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        {t('export')}
                      </div>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}