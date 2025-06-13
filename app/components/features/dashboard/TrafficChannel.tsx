'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/shared/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useTranslations } from 'next-intl';

// Real traffic data will be provided via props

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

export const TrafficChannel: React.FC<TrafficChannelProps> = ({ data, className }) => {
  const t = useTranslations('Dashboard');
  
  // Calculate total for center display (use percentage values)
  const totalPercentage = data.reduce((sum, entry) => sum + entry.value, 0);
  
  // Use the real data provided via props
  const pieData = data.map(item => ({
    name: item.name,
    value: item.value,
    color: item.color
  }));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">{t('trafficSources')}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Traffic source distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart Section */}
            <div className="flex justify-center">
              <div style={{ width: 200, height: 200, position: "relative" }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius-md)",
                        color: "hsl(var(--card-foreground))",
                      }}
                    />
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-foreground">{totalPercentage.toFixed(1)}%</span>
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
              </div>
            </div>
            
            {/* Legend Section */}
            <div className="flex flex-col justify-center space-y-2">
              <h4 className="text-sm font-medium text-foreground mb-2">Traffic Sources</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-foreground truncate">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground font-medium ml-2">
                      {item.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};