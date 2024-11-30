'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart } from "@/components/line-chart"
import { BarChart } from "@/components/bar-chart"
import { DonutChart } from "@/components/donut-chart"
import { useTheme } from "next-themes"
import { useEffect, useState, useRef } from 'react';
import { StatsCard } from '@/components/stats-card';
import pb from '@/lib/pocketbase';
import { log } from 'console';
import { AiChat } from "@/components/ai-chat"

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

// Add this color palette at the top of the file, after imports
const SOURCE_COLORS: Record<string, string> = {
  'Rozetka': '#00A046',    // Rozetka's brand green
  'PromUa': '#3E77AA',     // PromUa's brand blue
  'OLX': '#002F34',        // OLX's brand dark
  'Instagram': '#E4405F',  // Instagram brand color
  'Facebook': '#1877F2',   // Facebook blue
  'Direct': '#4B6BFB',     // Cool blue
  'Email': '#FF6B6B',      // Warm red
  'Affiliate': '#FFC107',  // Warm yellow
  'Phone': '#10B981',      // Emerald green
  'Website': '#8B5CF6',    // Purple
  'Unknown': '#CBD5E1'     // Gray
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

    // Process monthly data first
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const orderMonth = orderDate.getMonth();
      const orderYear = orderDate.getFullYear();
      const amount = order.amount || 0;

      // Monthly data
      if (orderYear === currentYear) {
        monthlyData[orderMonth] += amount;
      }

      // Current vs Last month comparison
      if (orderYear === currentYear && orderMonth === currentMonth) {
        currentMonthRevenue += amount;
      } else if (orderMonth === (currentMonth - 1 + 12) % 12 && 
                (orderYear === currentYear || (orderMonth > currentMonth && orderYear === currentYear - 1))) {
        lastMonthRevenue += amount;
      }

      // Process traffic sources
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

  // Add this helper function to generate consistent colors for unknown sources
  function getRandomColor(str: string): string {
    // Generate a color based on the string to ensure consistency
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to a pleasant HSL color
    // Using 80% saturation and 60% lightness for good visibility
    const hue = hash % 360;
    return `hsl(${hue}, 80%, 60%)`;
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <StatsCard
            title="Total Revenue"
            value={`${orders[0]?.currency?.symbol || '€'}${stats.totalRevenue.toFixed(2)}`}
            change={{
              value: `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}%`,
              positive: stats.revenueChange >= 0
            }}
            data={stats.graphDataRevenue}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={stats.monthlyData}
                labels={months}
                className="h-[300px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Traffic Channel</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.trafficData.length > 0 ? (
                <DonutChart
                  data={stats.trafficData}
                  className="h-[250px]"
                />
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No traffic data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <AiChat />
        </div>
      </div>
    </div>
  );
}
