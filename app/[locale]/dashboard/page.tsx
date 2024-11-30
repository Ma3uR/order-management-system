'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart } from "@/components/line-chart"
import { BarChart } from "@/components/bar-chart"
import { DonutChart } from "@/components/donut-chart"
import { ArrowUp } from 'lucide-react'
import { useTheme } from "next-themes"

export default function Dashboard() {
  const t = useTranslations('Dashboard');
  const { theme } = useTheme();

  const monthlyData = [40, 50, 80, 50, 45, 55, 45, 50, 60, 80, 50, 60];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const trafficData = [
    { name: 'Direct', value: 25.36, color: '#4B6BFB' },
    { name: 'Email', value: 30.25, color: '#FF6B6B' },
    { name: 'Affiliate', value: 24.39, color: '#FFC107' },
    { name: 'Social', value: 20, color: '#4CAF50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6 space-y-6">
        {/* Stats Card */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-3">
                <div className="text-2xl font-bold">$253k</div>
                <div className="flex items-center text-green-500 text-sm">
                  <ArrowUp className="w-4 h-4" />
                  +1.25%
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Compared to last month</p>
              <LineChart 
                data={[20, 40, 30, 50, 30, 40]} 
                className="h-[40px] mt-4" 
                strokeColor="#4B6BFB"
              />
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart 
                data={monthlyData}
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
              <DonutChart 
                data={trafficData}
                className="h-[250px]"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
