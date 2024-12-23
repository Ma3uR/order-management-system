"use client";

import { useState, useEffect } from "react";
import { SettingsForm } from "./SettingsForm";
import { sourceSchema, type SourceFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/components/shared/ui/use-toast";
import { Trash2 } from "lucide-react";
import { Button } from "@/app/components/shared/ui/button";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { sourceService } from "@/app/services/api";
import { SourcesResponse } from "@/app/types/pocketbase-types";
import { LoadingSpinner } from "@/app/components/shared/ui/loading-spinner";

export function SourceSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
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
    const fetchSources = async () => {
      try {
        setIsLoading(true);
        const data = await sourceService.fetchAll();
        setSources(data);
      } catch (error) {
        console.error('Error fetching sources:', error);
        toast({
          title: t('error'),
          description: t('sourceLoadError'),
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSources();
  }, [toast, t]);

  const onSubmit = async (data: SourceFormData) => {
    console.log('Source - Starting submission:', data);
    setIsLoading(true);
    try {
      const response = await sourceService.create(data);
      console.log('Source - API Response:', response);
      
      if (!response.ok) throw new Error(t('sourceSaveError'));
      
      console.log('Source - Showing success notification');
      toast({
        title: t('saveSuccess'),
        description: t('sourceSaveSuccess'),
        variant: "default"
      });
      
      const updatedSources = await sourceService.fetchAll();
      setSources(updatedSources);
    } catch (error: unknown) {
      console.error('Source - Error occurred:', error);
      if (error instanceof Error) {
        toast({
          title: t('saveError'),
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: t('saveError'),
          description: t('sourceSaveError'),
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await sourceService.delete(id);
      toast({
        title: t('deleteSuccess'),
        description: t('sourceDeleteSuccess'),
        variant: "default"
      });
      const updatedSources = await sourceService.fetchAll();
      setSources(updatedSources);
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: t('deleteError'),
        description: t('sourceDeleteError'),
        variant: "destructive"
      });
    }
  }

  if (isLoading) {
    return <LoadingSpinner />;
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