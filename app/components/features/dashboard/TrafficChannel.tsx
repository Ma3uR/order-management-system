'use client';

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { motion } from "framer-motion";
import { useTranslations } from 'next-intl';

interface TrafficChannelProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
    rawValue?: number;
    sourceId?: string;
  }>;
  className?: string;
}

// Custom tooltip component with proper TypeScript types
const CustomTooltip = ({ active, payload }: { 
  active?: boolean; 
  payload?: Array<{ payload: Record<string, unknown> }> 
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-2 shadow-md rounded-md border border-gray-200 dark:border-gray-700">
        <p className="font-medium">{String(data.name)}</p>
        <p>Value: {Number(data.value).toFixed(1)}%</p>
        {typeof data.rawValue === 'number' && (
          <p>Raw amount: {Number(data.rawValue).toFixed(2)}</p>
        )}
        {typeof data.sourceId === 'string' && (
          <p className="text-xs text-gray-500">ID: {data.sourceId}</p>
        )}
      </div>
    );
  }
  return null;
};

// Custom active shape for better visualization
// Note: We have to use 'any' here because recharts has incompatible type expectations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

// Custom label renderer with improved positioning
// Note: We have to use any for compatibility with recharts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, percent, name } = props;
  
  // Calculate the positioning of the label to prevent overlap
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30; // Position labels further out
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Only show labels for items with more than 5% to prevent clutter
  if (percent < 0.05) return null;
  
  // Different positioning based on which side of the chart
  const textAnchor = x > cx ? 'start' : 'end';
  
  return (
    <text 
      x={x} 
      y={y} 
      fill="currentColor" // Use currentColor to respect theme
      className="text-xs" 
      textAnchor={textAnchor}
      dominantBaseline="central"
    >
      {`${name} (${(percent * 100).toFixed(1)}%)`}
    </text>
  );
};

export const TrafficChannel: React.FC<TrafficChannelProps> = ({ data, className }) => {
  const t = useTranslations('Dashboard');
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-md font-medium">{t('trafficSources')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  animationDuration={750}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}; 