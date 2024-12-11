'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import pb from '@/lib/pocketbase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CostData {
  department: string;
  costType: string;
  amount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function ProductionCostsAnalytics() {
  const t = useTranslations('ProductionCosts');
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.floor((new Date().getMonth() / 3)) + 1);
  const [costsByDepartment, setCostsByDepartment] = useState<any[]>([]);
  const [costsByType, setCostsByType] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [year, quarter]);

  const loadData = async () => {
    try {
      const records = await pb.collection('production_costs').getFullList({
        filter: `year=${year} && quarter=${quarter}`,
      });

      // Process data for department chart
      const departmentTotals: Record<string, number> = {};
      records.forEach((record: any) => {
        departmentTotals[record.department] = (departmentTotals[record.department] || 0) + record.amount;
      });

      const departmentData = Object.entries(departmentTotals).map(([department, amount]) => ({
        department: t(`departments.${department}`),
        amount,
      }));

      // Process data for cost type chart
      const typeTotals: Record<string, number> = {};
      records.forEach((record: any) => {
        typeTotals[record.costType] = (typeTotals[record.costType] || 0) + record.amount;
      });

      const typeData = Object.entries(typeTotals).map(([type, amount]) => ({
        name: t(type.replace('_', '')),
        value: amount,
      }));

      setCostsByDepartment(departmentData);
      setCostsByType(typeData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('costsByDepartment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costsByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('costsByType')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 