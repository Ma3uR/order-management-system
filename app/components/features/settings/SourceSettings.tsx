"use client";

import { useState, useEffect } from "react";
import { SettingsForm } from "./SettingsForm";
import { sourceSchema, type SourceFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2, Pencil } from "lucide-react";
import type { SourcesResponse } from "@/app/types/pocketbase-types";
import { sourceService } from "@/app/services/api";
import { toast } from 'sonner';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/app/components/shared/ui/form";

export function SourceSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<SourcesResponse[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<SourceFormData>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      name: "",
      url: "",
    }
  });

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
        toast.error(t('error'), {
          description: t('sourceLoadError'),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSources();
  }, [t]);

  const handleEdit = (source: SourcesResponse) => {
    setEditingId(source.id);
    form.reset({
      name: source.name,
      url: source.url || ""
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await sourceService.delete(id);
      toast.success(t('deleteSuccess'), {
        description: t('sourceDeleteSuccess'),
      });
      const updatedSources = await sourceService.fetchAll();
      setSources(updatedSources);
    } catch (error) {
      console.error('Error deleting source:', error);
      toast.error(t('deleteError'), {
        description: t('sourceDeleteError'),
      });
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <SettingsForm
          title={editingId ? t('editSource') : t('addSource')}
          schema={sourceSchema}
          form={form}
          onSubmit={async (data) => {
            console.log('Source - Starting submission:', data);
            setIsLoading(true);
            try {
              if (editingId) {
                const response = await sourceService.update(editingId, data);
                console.log('Source - API Response:', response);
                
                if (!response.ok) throw new Error(t('sourceUpdateError'));
                
                console.log('Source - Showing success notification');
                toast.success(t('saveSuccess'), {
                  description: t('sourceUpdateSuccess'),
                });
                setEditingId(null);
                form.reset({ name: "", url: "" });
              } else {
                const response = await sourceService.create(data);
                console.log('Source - API Response:', response);
                
                if (!response.ok) throw new Error(t('sourceSaveError'));
                
                console.log('Source - Showing success notification');
                toast.success(t('saveSuccess'), {
                  description: t('sourceSaveSuccess'),
                });
                form.reset({ name: "", url: "" });
              }
              
              const updatedSources = await sourceService.fetchAll();
              setSources(updatedSources);
            } catch (error: unknown) {
              console.error('Source - Error occurred:', error);
              if (error instanceof Error) {
                toast.error(t('saveError'), {
                  description: error.message,
                });
              } else {
                toast.error(t('saveError'), {
                  description: t('sourceSaveError'),
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
          <h3 className="text-lg font-semibold mb-4">{t('sources')}</h3>
          <div className="space-y-4">
            {Array.isArray(sources) && sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{source.name}</span>
                  <span className="text-sm text-muted-foreground">{source.url}</span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(source)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(source.id)}
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