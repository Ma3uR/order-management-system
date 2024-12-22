"use client";

import { useState, useEffect, useCallback } from "react";
import { SettingsForm } from "./SettingsForm";
import { deliveryMethodSchema, type DeliveryMethodFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useNotification } from "@/app/components/ui/notifications";
import type { DeliveryOptionsResponse } from "@/app/types/pocketbase-types";
import { deliveryService } from "@/app/services/api";

export function DeliveryMethodSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryOptionsResponse[]>([]);
  const defaultValues: DeliveryMethodFormData = {
    name: "",
  };
  const { showNotification } = useNotification();

  const fetchDeliveryMethods = useCallback(async () => {
    try {
      const methods = await deliveryService.fetchAll();
      setDeliveryMethods(methods);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error fetching delivery methods:', error);
        showNotification({
          title: t('error'),
          description: error.message,
          type: "error"
        });
      } else {
        console.error('Error fetching delivery methods:', error);
        showNotification({
          title: t('error'),
          description: t('fetchError'),
          type: "error"
        });
      }
    }
  }, [showNotification, t]);

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
    setIsLoading(true);
    try {
      await deliveryService.create(data);
      showNotification({
        title: t('saveSuccess'),
        description: t('deliveryMethodSaveSuccess'),
        type: "success"
      });
      const updatedMethods = await deliveryService.fetchAll();
      setDeliveryMethods(updatedMethods);
    } catch (error) {
      console.error('Error saving delivery method:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deliveryService.delete(id);
      showNotification({
        title: t('deleteSuccess'),
        description: t('deliveryMethodDeleteSuccess'),
        type: "success"
      });
      const updatedMethods = await deliveryService.fetchAll();
      setDeliveryMethods(updatedMethods);
    } catch (error) {
      console.error('Error deleting delivery method:', error);
      showNotification({
        title: t('deleteError'),
        description: t('deliveryMethodDeleteError'),
        type: "error"
      });
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