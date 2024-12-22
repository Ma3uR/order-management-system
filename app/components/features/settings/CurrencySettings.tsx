"use client";

import { useState, useEffect, useCallback } from "react";
import { SettingsForm } from "./SettingsForm";
import { currencySchema, type CurrencyFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useNotification } from "@/app/components/ui/notifications";
import type { CurrencyOptionsResponse } from "@/app/types/pocketbase-types";
import { currencyService } from "@/app/services/api";

export function CurrencySettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyOptionsResponse[]>([]);
  const { showNotification } = useNotification();

  const defaultValues: CurrencyFormData = {
    code: "",
    name: "",
    symbol: "",
    isDefault: false
  };

  const fields = [
    { name: "code" as const, label: t('currencyCode'), placeholder: "USD" },
    { name: "name" as const, label: t('currencyName'), placeholder: "US Dollar" },
    { name: "symbol" as const, label: t('currencySymbol'), placeholder: "$" },
  ];

  const fetchCurrencies = useCallback(async () => {
    try {
      const data = await currencyService.fetchAll();
      setCurrencies(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        showNotification({
          title: t('fetchError'),
          description: error.message,
          type: "error"
        });
      } else {
        showNotification({
          title: t('fetchError'),
          description: t('fetchErrorDescription'),
          type: "error"
        });
      }
    }
  }, [showNotification, t]);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const onSubmit = async (data: CurrencyFormData) => {
    setIsLoading(true);
    try {
      const response = await currencyService.create(data);
      
      if (!response.ok) throw new Error('Failed to save currency');
      
      showNotification({
        title: t('saveSuccess'),
        description: t('currencySaveSuccess'),
        type: "success"
      });
      
      fetchCurrencies();
    } catch (error: unknown) {
      if (error instanceof Error) {
        showNotification({
          title: t('saveError'),
          description: error.message,
          type: "error"
        });
      } else {
        showNotification({
          title: t('saveError'),
          description: t('currencySaveError'),
          type: "error"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await currencyService.delete(id);

      if (!response.ok) throw new Error('Failed to delete currency');

      showNotification({
        title: t('deleteSuccess'),
        description: t('currencyDeleteSuccess'),
        type: "success"
      });

      fetchCurrencies();
    } catch (error: unknown) {
      if (error instanceof Error) {
        showNotification({
          title: t('deleteError'),
          description: error.message,
          type: "error"
        });
      } else {
        showNotification({
          title: t('deleteError'),
          description: t('currencyDeleteError'),
          type: "error"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <SettingsForm
        title={t('addCurrency')}
        schema={currencySchema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        isLoading={isLoading}
        fields={fields}
      />

        <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('currencies')}</h3>
          <div className="space-y-4">
            {currencies.map((currency) => (
              <div
                key={currency.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <span className="font-medium">
                    {currency.name} ({currency.code})
                  </span>
                  <span className="text-muted-foreground">{currency.symbol}</span>
                  {currency.isDefault && (
                    <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                      {t('default')}
                    </span>
                  )}
                </div>
                   <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(currency.id)}
                  disabled={currency.isDefault}
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