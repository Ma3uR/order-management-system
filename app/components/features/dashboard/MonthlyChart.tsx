'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/shared/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { getTopProductsByPopularity } from '@/app/lib/services/orders';

interface ProductData {
  name: string;
  count: number;
}

interface MonthlyChartProps {
  data: number[];
  labels: string[];
  className?: string;
}


export function MonthlyChart({ className }: MonthlyChartProps) {
  const t = useTranslations('Dashboard');
  const { theme, systemTheme } = useTheme();
  const [productsData, setProductsData] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Determine if we're in dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const borderColor = isDarkMode ? '#374151' : '#e5e7eb';

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        // Get data for the last 30 days
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const result = await getTopProductsByPopularity(startDate, endDate, 8);
        
        if (result.topProducts && Array.isArray(result.topProducts)) {
          setProductsData(result.topProducts);
        }
      } catch (error) {
        console.error('Error fetching popular products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularProducts();
  }, []);

  // Transform the products data into bar chart format
  const barData = productsData.map((product, index) => ({
    name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
    fullName: product.name,
    value: product.count,
    color: `hsl(${(index * 45) % 360}, 45%, 65%)` // Generate different colors for each product
  }));

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        <Card className="shadow-md h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Popular Products</CardTitle>
          <CardDescription className="text-muted-foreground">
            Most ordered products (last 30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No product data available
            </div>
          ) : (
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={borderColor} opacity={0.3} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: textColor }}
                    axisLine={{ stroke: borderColor }}
                    tickLine={{ stroke: borderColor }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11, fill: textColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius-md)",
                      color: "hsl(var(--card-foreground))",
                    }}
                    labelStyle={{ fontWeight: "bold", color: "hsl(var(--card-foreground))" }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} orders`,
                      props.payload.fullName
                    ]}
                  />
                  <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]} name="Orders">
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}