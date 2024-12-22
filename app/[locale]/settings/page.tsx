"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { CurrencySettings } from "@/app/components/features/settings/CurrencySettings";
import { StatusSettings } from "@/app/components/features/settings/StatusSettings";
import { PaymentMethodSettings } from "@/app/components/features/settings/PaymentMethodSettings";
import { DeliveryMethodSettings } from "@/app/components/features/settings/DeliveryMethodSettings";
import { SourceSettings } from "@/app/components/features/settings/SourceSettings";

export default function SettingsPage() {
  const t = useTranslations('Settings');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>
      
      <Card className="p-6">
        <Tabs defaultValue="currency" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="currency">
              {t('currency')}
            </TabsTrigger>
            <TabsTrigger value="status">
              {t('status')}
            </TabsTrigger>
            <TabsTrigger value="payment">
              {t('payment')}
            </TabsTrigger>
            <TabsTrigger value="delivery">
              {t('delivery')}
            </TabsTrigger>
            <TabsTrigger value="source">
              {t('source')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="currency" className="space-y-4">
            <CurrencySettings />
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <StatusSettings />
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <PaymentMethodSettings />
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            <DeliveryMethodSettings />
          </TabsContent>

          <TabsContent value="source" className="space-y-4">
            <SourceSettings />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
