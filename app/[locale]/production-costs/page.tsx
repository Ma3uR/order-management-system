'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductionCostsTable } from '../../../components/ProductionCostsTable';
import { ProductionCostsAnalytics } from '../../../components/ProductionCostsAnalytics';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/theme-switcher';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

export default function ProductionCostsPage() {
  const t = useTranslations('ProductionCosts');
  return (
    <div className="w-full max-w-[calc(100vw-2rem)] md:container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToDashboard')}
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <Tabs defaultValue="table">
            <TabsList className="px-6 pt-6">
              <TabsTrigger value="table">{t('tabs.table')}</TabsTrigger>
              <TabsTrigger value="analytics">{t('tabs.analytics')}</TabsTrigger>
            </TabsList>
            <TabsContent value="table" className="m-0">
              <ProductionCostsTable />
            </TabsContent>
            <TabsContent value="analytics">
              <ProductionCostsAnalytics />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 