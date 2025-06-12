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
    trafficData: [] as { 
      name: string; 
      value: number; 
      color: string; 
      sourceId: string; 
    }[],
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
      // First ensure we're authenticated as admin for this call
      try {
        await pb.admins.authWithPassword(
          process.env.NEXT_PUBLIC_POCKETBASE_ADMIN_EMAIL || '',
          process.env.NEXT_PUBLIC_POCKETBASE_ADMIN_PASSWORD || ''
        );
        console.log("Admin authentication successful for sources fetch");
      } catch (authError) {
        console.error("Admin authentication failed:", authError);
      }

      // Declare this at the top level of the try block to make it accessible to all code
      const hardcodedSources: Record<string, { name: string; color: string }> = {
        "gfzk8nxfokgu9ku": { name: "Rozetka", color: SOURCE_COLORS["Rozetka"] },
        // Add other sources as needed
      };

      // Try to load sources directly with a raw fetch to diagnose issues
      try {
        console.log("Trying direct API fetch to troubleshoot sources access...");
        const apiUrl = `${pb.baseUrl}/api/collections/sources/records?sort=created`;
        const authToken = pb.authStore.token;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Direct API fetch results:", data);
        } else {
          console.error("Direct API fetch failed:", response.status, await response.text());
        }
      } catch (directError) {
        console.error("Error in direct API fetch:", directError);
      }

      const sourcesRecords = await authenticatedCall(() => 
        pb.collection('sources').getFullList<Source>({
          sort: 'name',
          $autoCancel: false
        })
      );

      console.log('Sources records count:', sourcesRecords?.length || 0);
      console.log('Sources records data:', JSON.stringify(sourcesRecords, null, 2));

      // Add a fallback source for the problematic ID if no sources found
      if (!sourcesRecords || sourcesRecords.length === 0) {
        console.warn("No sources found! Creating hardcoded mappings");
        
        // Use these hardcoded sources
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
          const hardcodedSource = hardcodedSources[sourceId];
          const sourceName = hardcodedSource?.name || 'Unknown';
          const sourceColor = hardcodedSource?.color || '#CBD5E1';

          if (!sourceData[sourceName]) {
            sourceData[sourceName] = { value: 0, color: sourceColor };
          }
          sourceData[sourceName].value += amount;
        });
      } else {
        // Original code with sources found
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
      }

      // Calculate revenue change with validation to prevent NaN or Infinity
      let revenueChange = 0;
      if (lastMonthRevenue > 0) {
        revenueChange = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
        // Make sure it's a valid number
        if (!isFinite(revenueChange) || isNaN(revenueChange)) {
          revenueChange = 0;
        }
      }

      const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);

      // Create sourceNameToId mapping for the trafficData
      const sourceNameToId: Record<string, string> = {};
      
      // Populate from sourcesRecords if available
      if (sourcesRecords && sourcesRecords.length > 0) {
        sourcesRecords.forEach(source => {
          if (source.name) {
            sourceNameToId[source.name] = source.id;
          }
        });
      } 
      // Add hardcoded sources
      else {
        Object.entries(hardcodedSources).forEach(([id, data]) => {
          sourceNameToId[data.name] = id;
        });
      }

      const trafficData = Object.entries(sourceData)
        .map(([name, data]) => ({
          name,
          value: totalRevenue > 0 ? (data.value / totalRevenue) * 100 : 0,
          color: data.color,
          // Use the sourceNameToId mapping
          sourceId: sourceNameToId[name] || 'unknown'
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
              value: `${!isNaN(stats.revenueChange) && isFinite(stats.revenueChange) ? 
                `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}%` : 
                '0%'}`,
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
            labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
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