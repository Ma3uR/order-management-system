'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { BarChart } from "@/app/components/shared/charts/BarChart";
import { useTranslations } from 'next-intl';
import { motion } from "framer-motion";

interface MonthlyChartProps {
  data: number[];
  labels: string[];
  className?: string;
}

export function MonthlyChart({ data, labels, className }: MonthlyChartProps) {
  const t = useTranslations('Dashboard');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            {t('monthlySales')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <BarChart
              data={data}
              labels={labels}
              className="h-full w-full"
              colors={{
                bar: "var(--sidebar-primary)",
                background: "var(--sidebar-accent)",
                text: "var(--sidebar-foreground)",
                grid: "var(--sidebar-border)"
              }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 