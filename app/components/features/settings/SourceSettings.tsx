"use client";

import { useState, useEffect } from "react";
import { SettingsForm } from "./SettingsForm";
import { sourceSchema, type SourceFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { useNotification } from "../../ui/notifications";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sourceService } from "@/app/services/api";
import { SourcesResponse } from "@/app/types/pocketbase-types";

export function SourceSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();
  const [sources, setSources] = useState<SourcesResponse[]>([]);
  const defaultValues: SourceFormData = {
    name: "",
    url: "",
  };

  const fields = [
    { 
      name: "name" as const, 
      label: t('sourceName'), 
      placeholder: t('sourceNamePlaceholder') 
    },
    { 
      name: "url" as const, 
      label: t('sourceUrl'), 
      placeholder: "https://example.com",
      type: "url"
    },
  ];

  useEffect(() => {
    const loadSources = async () => {
      try {
        const sources = await sourceService.fetchAll();
        setSources(sources);
      } catch (error) {
        console.error('Error loading sources:', error);
        showNotification({
          title: t('error'),
          description: t('sourceLoadError'),
          type: "error"
        });
      }
    };

    loadSources();
  }, [showNotification, t]);

  const onSubmit = async (data: SourceFormData) => {
    setIsLoading(true);
    try {
      await sourceService.create(data);
      showNotification({
        title: t('saveSuccess'),
        description: t('sourceSaveSuccess'),
        type: "success"
      });
      const updatedSources = await sourceService.fetchAll();
      setSources(updatedSources);
    } catch (error) {
      console.error('Error saving source:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await sourceService.delete(id);
      showNotification({
        title: t('deleteSuccess'),
        description: t('sourceDeleteSuccess'),
        type: "success"
      });
      const updatedSources = await sourceService.fetchAll();
      setSources(updatedSources);
    } catch (error) {
      console.error('Error deleting source:', error);
      showNotification({
        title: t('deleteError'),
        description: t('sourceDeleteError'),
        type: "error"
      });
    }
  }

  return (
    <div className="space-y-6">
      <SettingsForm
        title={t('addSource')}
        schema={sourceSchema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        isLoading={isLoading}
        fields={fields}
      />

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('sources')}</h3>
          <div className="space-y-4">
            {Array.isArray(sources) && sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{source.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(source.id)}
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