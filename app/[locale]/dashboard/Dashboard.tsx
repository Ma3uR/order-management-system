'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart } from "@/components/line-chart"
import { BarChart } from "@/components/bar-chart"
import { DonutChart } from "@/components/donut-chart"
import { useTheme } from "next-themes"
import { useEffect, useState, useRef } from 'react';
import { StatsCard } from '@/components/stats-card';
import pb, { getPocketBase } from '@/lib/pocketbase';
import { AiChat } from "@/components/ai-chat"
import { motion } from "framer-motion";

interface Order {
  id: string;
  amount: number;
  source: string;
  createdAt: string;
  currency: {
    symbol: string;
  };
  expand?: {
    source: {
      id: string;
      name: string;
      color: string;
    };
  };
}

const SOURCE_COLORS: Record<string, string> = {
  'Rozetka': '#00A046',
  'PromUa': '#3E77AA',
  'OLX': '#002F34',
  'Instagram': '#E4405F',
  'Facebook': '#1877F2',
  'Direct': '#4B6BFB',
  'Email': '#FF6B6B',
  'Affiliate': '#FFC107',
  'Phone': '#10B981',
  'Website': '#8B5CF6',
  'Unknown': '#CBD5E1'
};

export default function Dashboard() {
  const t = useTranslations('Dashboard');
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueChange: 0,
    monthlyData: Array(12).fill(0),
    trafficData: [] as { name: string; value: number; color: string }[],
    graphDataRevenue: Array(12).fill(0)
  });
  const mounted = useRef(false);

  useEffect(() => {
    const pb = getPocketBase();
    mounted.current = true;
    const fetchData = async () => {
      try {
        const records = await pb.collection('orders').getFullList({
          sort: '-created',
          expand: 'currency',
          fields: 'id,amount,source,created,expand.currency.symbol',
          $autoCancel: false
        });

        if (!mounted.current) return;

        const transformedOrders = records.map(record => ({
          id: record.id,
          amount: record.amount || 0,
          source: record.source,
          createdAt: record.created,
          currency: record.expand?.currency || { symbol: '€' }
        }));

        setOrders(transformedOrders);
        await calculateStats(transformedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        if (mounted.current) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted.current = false;
    };
  }, []);

  const calculateStats = async (orders: Order[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyData = Array(12).fill(0);
    const sourceData: Record<string, { value: number; color: string }> = {};

    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;

    // First, fetch all sources
    let sources: Record<string, { name: string; color: string }> = {};
    try {
      const response = await fetch('/api/sources');
      if (!response.ok) throw new Error('Failed to fetch sources');
      const sourcesData = await response.json();
      sources = sourcesData.reduce((acc: Record<string, any>, source: any) => {
        acc[source.id] = {
          name: source.name,
          color: SOURCE_COLORS[source.name] || source.color || getRandomColor(source.name)
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('Error fetching sources:', error);
    }

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const orderMonth = orderDate.getMonth();
      const orderYear = orderDate.getFullYear();
      const amount = order.amount || 0;

      if (orderYear === currentYear) {
        monthlyData[orderMonth] += amount;
      }

      if (orderYear === currentYear && orderMonth === currentMonth) {
        currentMonthRevenue += amount;
      } else if (orderMonth === (currentMonth - 1 + 12) % 12 && 
                (orderYear === currentYear || (orderMonth > currentMonth && orderYear === currentYear - 1))) {
        lastMonthRevenue += amount;
      }

      const sourceId = order.source;
      const sourceName = sources[sourceId]?.name || 'Unknown';
      const sourceColor = sources[sourceId]?.color || '#CBD5E1';

      if (!sourceData[sourceName]) {
        sourceData[sourceName] = { value: 0, color: sourceColor };
      }
      sourceData[sourceName].value += amount;
    });

    const revenueChange = lastMonthRevenue ? 
      ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);

    const trafficData = Object.entries(sourceData)
      .map(([name, data]) => ({
        name,
        value: (data.value / totalRevenue) * 100,
        color: data.color
      }))
      .sort((a, b) => b.value - a.value);

    setStats({
      totalRevenue,
      revenueChange,
      monthlyData,
      trafficData,
      graphDataRevenue: monthlyData
    });
  };

  function getRandomColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 80%, 60%)`;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <motion.div 
        className="space-y-4 md:space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div 
          className="grid grid-cols-1 gap-4 md:gap-6"
          variants={itemVariants}
        >
          <StatsCard
            title={t('totalRevenue')}
            value={`${orders[0]?.currency?.symbol || '€'}${stats.totalRevenue.toFixed(2)}`}
            change={{
              value: `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}%`,
              positive: stats.revenueChange >= 0
            }}
            data={stats.graphDataRevenue}
          />
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
          variants={itemVariants}
        >
          <motion.div variants={itemVariants} className="w-full">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base md:text-lg">{t('monthlySales')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] md:h-[300px] w-full">
                  <BarChart
                    data={stats.monthlyData}
                    labels={months}
                    className="h-full w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base md:text-lg">{t('trafficChannel')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] md:h-[300px] w-full">
                  {stats.trafficData.length > 0 ? (
                    <DonutChart
                      data={stats.trafficData}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      {t('noTrafficData')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 gap-4 md:gap-6"
          variants={itemVariants}
        >
          <AiChat />
        </motion.div>
      </motion.div>
    </div>
  );
} 