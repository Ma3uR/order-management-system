'use client';

import { motion } from "framer-motion";
import { TotalRevenue } from "./TotalRevenue";
import { MonthlyChart } from "./MonthlyChart";
import { TrafficChannel } from "./TrafficChannel";
import { AiChatBox } from "./AiChatBox";
import { useEffect, useState, useRef, useCallback } from 'react';
import pb from '@/app/lib/pocketbase';
import { authenticatedCall } from '@/app/lib/pocketbase';

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

interface Source {
  id: string;
  name: string;
  color: string;
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

  const calculateStats = useCallback(async (orders: Order[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyData = Array(12).fill(0);
    const sourceData: Record<string, { value: number; color: string }> = {};

    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;

    try {
      const sourcesRecords = await authenticatedCall(() => 
        pb.collection('sources').getFullList<Source>({
          $autoCancel: false
        })
      );

      const sourcesMap = sourcesRecords.reduce((acc, source) => {
        acc[source.id] = {
          name: source.name || 'Unknown',
          color: SOURCE_COLORS[source.name || ''] || getRandomColor(source.name || '')
        };
        return acc;
      }, {} as Record<string, { name: string; color: string }>);

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
        const sourceName = sourcesMap[sourceId]?.name || 'Unknown';
        const sourceColor = sourcesMap[sourceId]?.color || '#CBD5E1';

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
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        return;
      }
      console.error('Error processing data:', error);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        const records = await authenticatedCall(() => 
          pb.collection('orders').getFullList({
            sort: '-created',
            expand: 'currency',
            fields: 'id,amount,source,created,expand.currency.symbol',
            $autoCancel: false,
            signal: abortController.signal
          })
        );

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
        if (error instanceof Error && 
            (error.message.includes('cancelled') || error.message.includes('aborted'))) {
          return;
        }
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
      abortController.abort();
    };
  }, [calculateStats]);

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900/30">
      <motion.div 
        className="container mx-auto p-4 md:p-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Top Row - Revenue Stats */}
        <motion.div variants={itemVariants}>
          <TotalRevenue
            value={`${orders[0]?.currency?.symbol || '€'}${stats.totalRevenue.toFixed(2)}`}
            change={{
              value: `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}%`,
              positive: stats.revenueChange >= 0
            }}
            data={stats.graphDataRevenue}
          />
        </motion.div>

        {/* Middle Row - Charts */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={itemVariants}
        >
          <TrafficChannel
            data={stats.trafficData}
            className="h-full"
          />
          <MonthlyChart
            data={stats.monthlyData}
            labels={months}
            className="h-full"
          />
        </motion.div>

        {/* AI Chat Box - Full Width (moved below charts) */}
        <motion.div variants={itemVariants} className="h-[800px] relative">
          <AiChatBox className="h-full w-full" />
        </motion.div>
      </motion.div>
    </div>
  );
} 