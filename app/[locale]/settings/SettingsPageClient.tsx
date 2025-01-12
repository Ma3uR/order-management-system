"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/shared/ui/tabs";
import { Card, CardHeader, CardContent } from "@/app/components/shared/ui/card";
import { useTranslations } from "next-intl";
import { CurrencySettings } from "@/app/components/features/settings/CurrencySettings";
import { StatusSettings } from "@/app/components/features/settings/StatusSettings";
import { PaymentMethodSettings } from "@/app/components/features/settings/PaymentMethodSettings";
import { DeliveryMethodSettings } from "@/app/components/features/settings/DeliveryMethodSettings";
import { SourceSettings } from "@/app/components/features/settings/SourceSettings";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from 'sonner';
import { Badge } from "@/app/components/shared/ui/badge";
import { Button } from "@/app/components/shared/ui/button";
import { CircleIcon, RefreshCcw, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import pb, { authenticatedCall } from "@/app/lib/pocketbase";
import { format } from "date-fns";
import { handleSync } from "./actions/sync";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { checkConnection } from "./actions/connection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/shared/ui/collapsible";

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

const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

interface SettingsPageClientProps {
  translations: {
    backToDashboard: string;
  };
}

export default function SettingsPageClient({}: SettingsPageClientProps) {
  const t = useTranslations('Settings');
  const [isConnected, setIsConnected] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const checkRozetkaConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const result = await checkConnection();
      setIsConnected(result.success);
    } catch (error) {
      setIsConnected(false);
      toast.error('Failed to connect to Rozetka');
      console.error('Connection error:', error);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    async function initialize() {
      try {
        await checkRozetkaConnection();
        const records = await authenticatedCall(() => pb.collection('sync_records').getList(1, 1, {
          sort: '-created',
        }));
        
        if (records.items.length > 0) {
          const lastSyncDate = new Date(records.items[0].created);
          setLastSync(format(lastSyncDate, 'yyyy-MM-dd HH:mm'));
        } else {
          setLastSync(null);
        }
      } catch (error) {
        console.error('Error initializing:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  return (
    <>
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
            <Tabs defaultValue="status" className="w-full">
              <TabsList className="flex h-10 items-center justify-start px-4 border-b">
                {["status", "payment", "delivery", "source"].map((tab, index) => (
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

        <motion.div variants={slideIn}>
          <Collapsible
            open={!isCollapsed}
            onOpenChange={() => setIsCollapsed(!isCollapsed)}
            className="w-full"
          >
            <Card className="border shadow-sm">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 pb-2">
                      <h3 className="text-lg font-medium">Rozetka Connection Status</h3>
                      <Badge 
                        variant={isConnected ? "success" : "destructive"}
                        className="px-3"
                      >
                        <CircleIcon className="w-3 h-3 mr-1 fill-current" />
                        {isConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      {isCollapsed && (
                        <p className="text-sm text-muted-foreground">
                          Last sync: {isLoading ? "Loading..." : lastSync || "Never"}
                        </p>
                      )}
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        !isCollapsed && "transform rotate-180"
                      )} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          Last Synchronization
                        </p>
                        <p className="text-sm">
                          {isLoading ? (
                            <span className="text-muted-foreground">Loading...</span>
                          ) : lastSync ? (
                            lastSync
                          ) : (
                            <span className="text-muted-foreground">Never synced</span>
                          )}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-2"
                        disabled={isSyncing}
                        onClick={async () => {
                          setIsSyncing(true);
                          try {
                            const result = await handleSync();
                            if (result.success) {
                              toast.success('Sync completed successfully');
                              // Refresh the last sync time
                              const records = await pb.collection('sync_records').getList(1, 1, {
                                sort: '-created',
                              });
                              if (records.items.length > 0) {
                                setLastSync(format(new Date(records.items[0].created), 'yyyy-MM-dd HH:mm'));
                              }
                            } else {
                              toast.error(result.error || 'Sync failed');
                            }
                          } catch (error) {
                            toast.error('Failed to sync');
                            console.error('Sync error:', error);
                          } finally {
                            setIsSyncing(false);
                          }
                        }}
                      >
                        <RefreshCcw className={cn("w-4 h-4", { "animate-spin": isSyncing })} />
                        {isSyncing ? "Syncing..." : "Sync Now"}
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        API Status
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="px-2">
                            Rate Limit: 100/100
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="px-2">
                            Response Time: 150ms
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button 
                        variant="secondary"
                        className="w-full"
                        disabled={isCheckingConnection}
                        onClick={checkRozetkaConnection}
                      >
                        {isCheckingConnection ? (
                          <>
                            <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                            Checking Connection...
                          </>
                        ) : (
                          'Reconnect to Rozetka'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      </motion.div>
      <Toaster
        position="top-right"
        expand={true}
        richColors
        closeButton
        className="transform-gpu"
      />
    </>
  );
} 