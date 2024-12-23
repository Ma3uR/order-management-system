"use client";

import { SettingsForm } from "./SettingsForm";
import { paymentMethodSchema, type PaymentMethodFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/app/components/shared/ui/use-toast";
import type { PaymentOptionsResponse } from "@/app/types/pocketbase-types";
import { paymentService } from "@/app/services/api";

export function PaymentMethodSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentOptionsResponse[]>([]);
  const { toast } = useToast();

  const defaultValues: PaymentMethodFormData = {
    name: "",
  };

  const fields = [
    { 
      name: "name" as const, 
      label: t('paymentMethodName'), 
      placeholder: t('paymentMethodPlaceholder') 
    },
  ];
    
    const fetchPaymentMethods = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await paymentService.fetchAll();
      setPaymentMethods(response);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: t('fetchError'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: t('fetchError'),
          description: t('paymentMethodFetchError'),
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const onSubmit = async (data: PaymentMethodFormData) => {
    setIsLoading(true);
    try {
      await paymentService.create(data);

      toast({
        title: t('saveSuccess'),
        description: t('paymentMethodSaveSuccess'),
        variant: "default"
      });
      
      fetchPaymentMethods();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: t('saveError'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: t('saveError'),
          description: t('paymentMethodSaveError'),
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await paymentService.delete(id);
      toast({
        title: t('deleteSuccess'),
        description: t('paymentMethodDeleteSuccess'),
        variant: "default"
      });

      fetchPaymentMethods();
    } catch (error: unknown | Error ) {
      if (error instanceof Error) {
        toast({
          title: t('deleteError'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: t('deleteError'),
          description: t('paymentMethodDeleteError'),
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsForm
        title={t('addPaymentMethod')}
        schema={paymentMethodSchema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        isLoading={isLoading}
        fields={fields}
      />

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('paymentMethods')}</h3>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <span className="font-medium">{method.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(method.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 