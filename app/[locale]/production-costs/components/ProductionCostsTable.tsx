'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pb } from '@/lib/pb';

                            <Input
                              type="number"
                              value={value}
                              onChange={(e) => handleCellChange(rowIndex, key as Exclude<keyof CostRow, 'department' | 'total'>, parseFloat(e.target.value) || 0)}
                              className="w-24"
                            /> 