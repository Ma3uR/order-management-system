"use client";

import { useState, useEffect } from "react";
import { SettingsForm } from "./SettingsForm";
import { paymentMethodSchema, type PaymentMethodFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/app/components/shared/ui/input";
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/shared/ui/collapsible";
import { motion, AnimatePresence } from 'framer-motion';
import { deletePaymentMethod, getAllPaymentMethods, updatePaymentMethod } from "@/app/actions/payment-methods";
import { PaymentMethodsResponse } from "@/app/types/pocketbase-types";
import { createPaymentMethod } from "@/app/actions/payment-methods";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.2 }
};

const listItem = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.2 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

export function PaymentMethodSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodsResponse[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const defaultValues: PaymentMethodFormData = {
    name: "",
  };

  const fields = [
    { 
      name: "name" as const, 
      label: t('paymentMethodName'), 
      placeholder: t('paymentMethodNamePlaceholder') 
    },

  ];

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        setIsLoading(true);
        const paymentMethods = await getAllPaymentMethods();
        setMethods(paymentMethods.data || []);
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        toast.error(t('error'), {
          description: t('paymentMethodLoadError'),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMethods();
  }, [t]);

  const onSubmit = async (data: PaymentMethodFormData) => {
    try {
      setIsLoading(true);
      await createPaymentMethod(data);
      toast.success(t('saveSuccess'), { 
        description: t('paymentMethodSaveSuccess'),
      });
      const updatedMethods = await getAllPaymentMethods();
      setMethods(updatedMethods.data || []);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error creating payment method:', error);
      toast.error(t('saveError'), {
        description: t('paymentMethodSaveError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (method: PaymentMethodsResponse) => {
    setEditingId(method.id);
  };

  const handleSave = async (id: string, data: PaymentMethodFormData) => {
    try {
      if (!data.name) return;
      
      await updatePaymentMethod(id, { name: data.name });
      toast.success(t('saveSuccess'), {
        description: t('paymentMethodUpdateSuccess'),
      });
      const updatedMethods = await getAllPaymentMethods();
      setMethods(updatedMethods.data || []);
      setEditingId(null);
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast.error(t('saveError'), {
        description: t('paymentMethodUpdateError'),
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePaymentMethod(id);
      toast.success(t('deleteSuccess'), {
        description: t('paymentMethodDeleteSuccess'),
      });
      const updatedMethods = await getAllPaymentMethods();
      setMethods(updatedMethods.data || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error deleting payment method:', error);
        toast.error(t('deleteError'), {
          description: t('paymentMethodDeleteError'),
        });
      }
    }
  };

  if (isLoading && methods.length === 0) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-[200px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={fadeIn}>
        <Card className="border bg-card">
          <CardContent className="pt-6">
            <Collapsible
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              className="space-y-1"
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-2 rounded-md">
                  <h3 className="text-base font-medium">{t('addPaymentMethod')}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-9 p-0"
                  >
                    {isFormOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle form</span>
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                <SettingsForm
                  title=""
                  schema={paymentMethodSchema}
                  defaultValues={defaultValues}
                  onSubmit={onSubmit}
                  isLoading={isLoading}
                  fields={fields}
                  className="pt-2"
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-6">
              <AnimatePresence mode="popLayout">
                <motion.div 
                  className="space-y-2"
                  variants={staggerContainer}
                >
                  {methods.map((method) => (
                    <motion.div
                      key={method.id}
                      variants={listItem}
                      layout
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50"
                    >
                      <div className="flex-1 min-w-0">
                        {editingId === method.id ? (
                          <Input
                            defaultValue={method.name}
                            className="max-w-[200px]"
                            onBlur={(e) => {
                              if (!e.target.value.trim()) {
                                e.target.value = method.name;
                                return;
                              }
                              handleSave(method.id, { name: e.target.value.trim() });
                            }}
                          />
                        ) : (
                          <div className="space-y-1">
                            <p className="font-medium">{method.name}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-muted"
                          onClick={() => handleEdit(method)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(method.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
} 