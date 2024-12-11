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
import pb from '@/lib/pocketbase';

interface CostRow {
  department: string;
  rawMaterials: number;
  energy: number;
  labor: number;
  maintenance: number;
  services: number;
  taxes: number;
  techLosses: number;
  naturalLosses: number;
  other: number;
  total: number;
}

const initialRows: CostRow[] = [
  { department: 'purchases', rawMaterials: 0, energy: 0, labor: 0, maintenance: 0, services: 0, taxes: 0, techLosses: 0, naturalLosses: 0, other: 0, total: 0 },
  { department: 'production', rawMaterials: 0, energy: 0, labor: 0, maintenance: 0, services: 0, taxes: 0, techLosses: 0, naturalLosses: 0, other: 0, total: 0 },
  { department: 'logistics', rawMaterials: 0, energy: 0, labor: 0, maintenance: 0, services: 0, taxes: 0, techLosses: 0, naturalLosses: 0, other: 0, total: 0 },
  { department: 'sales', rawMaterials: 0, energy: 0, labor: 0, maintenance: 0, services: 0, taxes: 0, techLosses: 0, naturalLosses: 0, other: 0, total: 0 },
  { department: 'management', rawMaterials: 0, energy: 0, labor: 0, maintenance: 0, services: 0, taxes: 0, techLosses: 0, naturalLosses: 0, other: 0, total: 0 },
];

export function ProductionCostsTable() {
  const t = useTranslations('ProductionCosts');
  const [rows, setRows] = useState<CostRow[]>(initialRows);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.floor((new Date().getMonth() / 3)) + 1);

  useEffect(() => {
    loadData();
  }, [year, quarter]);

  const loadData = async () => {
    try {
      const records = await pb.collection('production_costs').getFullList({
        filter: `year=${year} && quarter=${quarter}`,
      });

      const newRows = [...initialRows];
      records.forEach((record: any) => {
        const rowIndex = newRows.findIndex(r => r.department === record.department);
        if (rowIndex !== -1) {
          switch (record.costType) {
            case 'raw_materials': newRows[rowIndex].rawMaterials = record.amount; break;
            case 'energy': newRows[rowIndex].energy = record.amount; break;
            case 'labor': newRows[rowIndex].labor = record.amount; break;
            case 'maintenance': newRows[rowIndex].maintenance = record.amount; break;
            case 'services': newRows[rowIndex].services = record.amount; break;
            case 'taxes': newRows[rowIndex].taxes = record.amount; break;
            case 'tech_losses': newRows[rowIndex].techLosses = record.amount; break;
            case 'natural_losses': newRows[rowIndex].naturalLosses = record.amount; break;
            case 'other': newRows[rowIndex].other = record.amount; break;
          }
        }
      });

      // Calculate totals
      newRows.forEach(row => {
        row.total = row.rawMaterials + row.energy + row.labor + row.maintenance + 
                   row.services + row.taxes + row.techLosses + row.naturalLosses + row.other;
      });

      setRows(newRows);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCellChange = async (
    rowIndex: number, 
    field: Exclude<keyof CostRow, 'department' | 'total'>, 
    value: number
  ) => {
    const newRows = [...rows];
    newRows[rowIndex][field] = value;
    newRows[rowIndex].total = newRows[rowIndex].rawMaterials + 
                             newRows[rowIndex].energy + 
                             newRows[rowIndex].labor + 
                             newRows[rowIndex].maintenance + 
                             newRows[rowIndex].services + 
                             newRows[rowIndex].taxes + 
                             newRows[rowIndex].techLosses + 
                             newRows[rowIndex].naturalLosses + 
                             newRows[rowIndex].other;
    setRows(newRows);

    // Map field names to cost types
    const costTypeMap: Record<string, string> = {
      rawMaterials: 'raw_materials',
      energy: 'energy',
      labor: 'labor',
      maintenance: 'maintenance',
      services: 'services',
      taxes: 'taxes',
      techLosses: 'tech_losses',
      naturalLosses: 'natural_losses',
      other: 'other'
    };

    try {
      const costType = costTypeMap[field];
      const existingRecord = await pb.collection('production_costs').getFirstListItem(
        `year=${year} && quarter=${quarter} && department="${rows[rowIndex].department}" && costType="${costType}"`
      ).catch(() => null);

      if (existingRecord) {
        await pb.collection('production_costs').update(existingRecord.id, {
          amount: value
        });
      } else {
        await pb.collection('production_costs').create({
          year,
          quarter,
          department: rows[rowIndex].department,
          costType,
          amount: value,
          date: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t('year')} />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t('quarter')} />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map(q => (
              <SelectItem key={q} value={q.toString()}>{t('quarterN', { n: q })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('department')}</TableHead>
              <TableHead>{t('rawMaterials')}</TableHead>
              <TableHead>{t('energy')}</TableHead>
              <TableHead>{t('labor')}</TableHead>
              <TableHead>{t('maintenance')}</TableHead>
              <TableHead>{t('services')}</TableHead>
              <TableHead>{t('taxes')}</TableHead>
              <TableHead>{t('techLosses')}</TableHead>
              <TableHead>{t('naturalLosses')}</TableHead>
              <TableHead>{t('other')}</TableHead>
              <TableHead>{t('total')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={row.department}>
                <TableCell>{t(`departments.${row.department}`)}</TableCell>
                {Object.entries(row).map(([key, value]) => {
                  if (key !== 'department') {
                    return (
                      <TableCell key={key}>
                        {key === 'total' ? (
                          value.toLocaleString()
                        ) : (
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) => handleCellChange(rowIndex, key as Exclude<keyof CostRow, 'department' | 'total'>, parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        )}
                      </TableCell>
                    );
                  }
                  return null;
                })}
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>{t('total')}</TableCell>
              {Object.keys(rows[0]).map(key => {
                if (key !== 'department') {
                  const total = rows.reduce((sum, row) => sum + (row[key as keyof CostRow] as number), 0);
                  return <TableCell key={key}>{total.toLocaleString()}</TableCell>;
                }
                return null;
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 