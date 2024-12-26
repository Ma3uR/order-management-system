"use client";

import { SettingsForm } from "./SettingsForm";
import { paymentMethodSchema, type PaymentMethodFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2, Pencil } from "lucide-react";
import type { PaymentOptionsResponse } from "@/app/types/pocketbase-types";
import { paymentService } from "@/app/services/api";
import { toast } from 'sonner';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function PaymentMethodSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentOptionsResponse[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const defaultValues: PaymentMethodFormData = {
    name: "",
  };

  const form = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues,
  });

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
        toast.error(t('fetchError'), {
          description: error.message,
        });
      } else {
        toast.error(t('fetchError'), {
          description: t('paymentMethodFetchError'),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const onSubmit = async (data: PaymentMethodFormData) => {
    setIsLoading(true);
    try {
      if (editingId) {
        await paymentService.update(editingId, data);
        toast.success(t('saveSuccess'), {
          description: t('paymentMethodUpdateSuccess'),
        });
        setEditingId(null);
      } else {
        await paymentService.create(data);
        toast.success(t('saveSuccess'), {
          description: t('paymentMethodSaveSuccess'),
        });
      }
      
      fetchPaymentMethods();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(t('saveError'), {
          description: error.message,
        });
      } else {
        toast.error(t('saveError'), {
          description: t('paymentMethodSaveError'),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (method: PaymentOptionsResponse) => {
    setEditingId(method.id);
    form.reset({
      name: method.name
    });
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await paymentService.delete(id);
      toast.success(t('deleteSuccess'), {
        description: t('paymentMethodDeleteSuccess'),
      });

      fetchPaymentMethods();
    } catch (error: unknown | Error ) {
      if (error instanceof Error) {
        toast.error(t('deleteError'), {
          description: error.message,
        });
      } else {
        toast.error(t('deleteError'), {
          description: t('paymentMethodDeleteError'),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsForm
        title={editingId ? t('editPaymentMethod') : t('addPaymentMethod')}
        schema={paymentMethodSchema}
        form={form}
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