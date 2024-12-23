"use client";

import { useState, useEffect, useCallback } from "react";
import { SettingsForm } from "./SettingsForm";
import { deliveryMethodSchema, type DeliveryMethodFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/app/components/shared/ui/use-toast";
import type { DeliveryOptionsResponse } from "@/app/types/pocketbase-types";
import { deliveryService } from "@/app/services/api";

export function DeliveryMethodSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryOptionsResponse[]>([]);
  const defaultValues: DeliveryMethodFormData = {
    name: "",
  };
  const { toast } = useToast();

  const fetchDeliveryMethods = useCallback(async () => {
    setIsLoading(true);
    try {
      const methods = await deliveryService.fetchAll();
      setDeliveryMethods(methods);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error fetching delivery methods:', error);
        toast({
          title: t('error'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.error('Error fetching delivery methods:', error);
        toast({
          title: t('error'),
          description: t('fetchError'),
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchDeliveryMethods();
  }, [fetchDeliveryMethods]);

  const fields = [
    { 
      name: "name" as const, 
      label: t('deliveryMethodName'), 
      placeholder: t('deliveryMethodPlaceholder') 
    },
  ];

  const onSubmit = async (data: DeliveryMethodFormData) => {
    console.log('DeliveryMethod - Starting submission:', data);
    setIsLoading(true);
    try {
      const response = await deliveryService.create(data);
      console.log('DeliveryMethod - API Response:', response);
      
      if (!response.ok) throw new Error(t('deliveryMethodSaveError'));
      
      console.log('DeliveryMethod - Showing success notification');
      toast({
        title: t('saveSuccess'),
        description: t('deliveryMethodSaveSuccess'),
        variant: "default"
      });
      
      fetchDeliveryMethods();
    } catch (error: unknown) {
      console.error('DeliveryMethod - Error occurred:', error);
      if (error instanceof Error) {
        toast({
          title: t('saveError'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: t('saveError'),
          description: t('deliveryMethodSaveError'),
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
      await deliveryService.delete(id);
      toast({
        title: t('deleteSuccess'),
        description: t('deliveryMethodDeleteSuccess'),
        variant: "default"
      });
      const updatedMethods = await deliveryService.fetchAll();
      setDeliveryMethods(updatedMethods);
    } catch (error) {
      console.error('Error deleting delivery method:', error);
      toast({
        title: t('deleteError'),
        description: t('deliveryMethodDeleteError'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsForm
        title={t('addDeliveryMethod')}
        schema={deliveryMethodSchema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        isLoading={isLoading}
        fields={fields}
      />

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('deliveryMethods')}</h3>
          <div className="space-y-4">
            {deliveryMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{method.name}</span>
                </div>
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