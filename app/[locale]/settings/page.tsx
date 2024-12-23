"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/shared/ui/tabs";
import { Card } from "@/app/components/shared/ui/card";
import { useTranslations } from "next-intl";
import { CurrencySettings } from "@/app/components/features/settings/CurrencySettings";
import { StatusSettings } from "@/app/components/features/settings/StatusSettings";
import { PaymentMethodSettings } from "@/app/components/features/settings/PaymentMethodSettings";
import { DeliveryMethodSettings } from "@/app/components/features/settings/DeliveryMethodSettings";
import { SourceSettings } from "@/app/components/features/settings/SourceSettings";
import { motion } from "framer-motion";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function SettingsPage() {
  const t = useTranslations('Settings');

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div 
        className="flex flex-col gap-4 mb-6"
        variants={fadeIn}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('settings')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('settingsDescription')}
        </p>
      </motion.div>
      
      <motion.div variants={fadeIn}>
        <Card className="border shadow-sm bg-card">
          <Tabs defaultValue="currency" className="w-full">
            <TabsList className="flex h-10 items-center justify-start px-4 border-b">
              {["currency", "status", "payment", "delivery", "source"].map((tab, index) => (
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TabsTrigger 
                    value={tab} 
                    className="px-4 py-2 -mb-px text-sm font-medium"
                  >
                    {t(tab)}
                  </TabsTrigger>
                </motion.div>
              ))}
            </TabsList>

            <motion.div 
              className="p-6"
              variants={fadeIn}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="currency" className="mt-0 border-0 p-0">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CurrencySettings />
                </motion.div>
              </TabsContent>

              <TabsContent value="status" className="mt-0 border-0 p-0">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <StatusSettings />
                </motion.div>
              </TabsContent>

              <TabsContent value="payment" className="mt-0 border-0 p-0">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <PaymentMethodSettings />
                </motion.div>
              </TabsContent>

              <TabsContent value="delivery" className="mt-0 border-0 p-0">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <DeliveryMethodSettings />
                </motion.div>
              </TabsContent>

              <TabsContent value="source" className="mt-0 border-0 p-0">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SourceSettings />
                </motion.div>
              </TabsContent>
            </motion.div>
          </Tabs>
        </Card>
      </motion.div>
    </motion.div>
  );
}
