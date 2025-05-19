'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useTranslations } from 'next-intl';

interface TotalRevenueProps {
  value: string;
  change: {
    value: string;
    positive: boolean;
  };
  data: number[];
  className?: string;
}

export function TotalRevenue({ value, change, data, className }: TotalRevenueProps) {
  const t = useTranslations('Dashboard');
  const chartData = data.map((value) => ({ value }));

  // Format the change value safely
  const safeChangeValue = change?.value || '0%';
  const isPositive = change?.positive ?? true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="bg-white/50 dark:bg-black/90 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            {t('totalRevenue')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                )}
                <span className={isPositive ? "text-green-500" : "text-red-500"}>
                  {safeChangeValue}
                </span>
              </div>
            </div>
            <div className="h-[64px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={isPositive ? "#10B981" : "#EF4444"}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 