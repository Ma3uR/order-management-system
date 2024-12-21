'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { useTranslations } from 'next-intl';

export function Statistics() {
  const t = useTranslations('Dashboard');

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$0</div>
        </CardContent>
      </Card>
    </div>
  );
} 