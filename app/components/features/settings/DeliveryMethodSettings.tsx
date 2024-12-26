"use client";

import { useState, useEffect, useCallback } from "react";
import { SettingsForm } from "./SettingsForm";
import { deliveryMethodSchema, type DeliveryMethodFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2, Pencil } from "lucide-react";
import type { DeliveryOptionsResponse } from "@/app/types/pocketbase-types";
import { deliveryService } from "@/app/services/api";
import { toast } from 'sonner';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/app/components/shared/ui/form";

export function DeliveryMethodSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryOptionsResponse[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<DeliveryMethodFormData>({
    resolver: zodResolver(deliveryMethodSchema),
    defaultValues: {
      name: "",
    }
  });

  const fetchDeliveryMethods = useCallback(async () => {
    setIsLoading(true);
    try {
      const methods = await deliveryService.fetchAll();
      setDeliveryMethods(methods);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error fetching delivery methods:', error);
        toast.error(t('error'), {
          description: error.message,
        });
      } else {
        console.error('Error fetching delivery methods:', error);
        toast.error(t('error'), {
          description: t('fetchError'),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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

  const handleEdit = (method: DeliveryOptionsResponse) => {
    setEditingId(method.id);
    form.reset({
      name: method.name
    });
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await deliveryService.delete(id);
      toast.success(t('deleteSuccess'), {
        description: t('deliveryMethodDeleteSuccess'),
      });
      const updatedMethods = await deliveryService.fetchAll();
      setDeliveryMethods(updatedMethods);
    } catch (error) {
      console.error('Error deleting delivery method:', error);
      toast.error(t('deleteError'), {
        description: t('deliveryMethodDeleteError'),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <SettingsForm
          title={editingId ? t('editDeliveryMethod') : t('addDeliveryMethod')}
          schema={deliveryMethodSchema}
          form={form}
          onSubmit={async (data) => {
            console.log('DeliveryMethod - Starting submission:', data);
            setIsLoading(true);
            try {
              if (editingId) {
                const response = await deliveryService.update(editingId, data);
                console.log('DeliveryMethod - API Response:', response);
                
                if (!response.ok) throw new Error(t('deliveryMethodUpdateError'));
                
                console.log('DeliveryMethod - Showing success notification');
                toast.success(t('saveSuccess'), {
                  description: t('deliveryMethodUpdateSuccess'),
                });
                setEditingId(null);
                form.reset({ name: "" });
              } else {
                const response = await deliveryService.create(data);
                console.log('DeliveryMethod - API Response:', response);
                
                if (!response.ok) throw new Error(t('deliveryMethodSaveError'));
                
                console.log('DeliveryMethod - Showing success notification');
                toast.success(t('saveSuccess'), {
                  description: t('deliveryMethodSaveSuccess'),
                });
                form.reset({ name: "" });
              }
              
              fetchDeliveryMethods();
            } catch (error: unknown) {
              console.error('DeliveryMethod - Error occurred:', error);
              if (error instanceof Error) {
                toast.error(t('saveError'), {
                  description: error.message,
                });
              } else {
                toast.error(t('saveError'), {
                  description: t('deliveryMethodSaveError'),
                });
              }
            } finally {
              setIsLoading(false);
            }
          }}
          isLoading={isLoading}
          fields={fields}
        />
      </Form>

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
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(method)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(method.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 