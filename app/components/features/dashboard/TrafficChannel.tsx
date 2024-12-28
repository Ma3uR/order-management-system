'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { motion } from "framer-motion";
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';

interface TrafficChannelProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  className?: string;
}

export function TrafficChannel({ data, className }: TrafficChannelProps) {
  const t = useTranslations('Dashboard');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const CustomLegend = ({ payload }: { payload: { name: string; value: number; color: string; }[] }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 pt-4">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {entry.value} ({data[index].value.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="h-full bg-white/50 dark:bg-black/90 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            {t('trafficChannel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke={isDark ? '#1f2937' : '#ffffff'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Legend
                    content={<CustomLegend payload={data} />}
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('noTrafficData')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 