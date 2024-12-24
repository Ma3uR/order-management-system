"use client";

import { useState, useEffect, useCallback } from "react";
import { SettingsForm } from "./SettingsForm";
import { statusSchema, type StatusFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2, Pencil } from "lucide-react";
import type { StatusOptionsResponse } from "@/app/types/pocketbase-types";
import { statusService } from "@/app/services/api";
import { Input } from "@/app/components/shared/ui/input";
import { toast } from 'sonner';

export function StatusSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [statuses, setStatuses] = useState<StatusOptionsResponse[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const defaultValues: StatusFormData = {
    name: "",
    color: "#000000",
    priority: 1
  };

  const fields = [
    { 
      name: "name" as const, 
      label: t('statusName'), 
      placeholder: t('statusNamePlaceholder') 
    },
    { 
      name: "color" as const, 
      label: t('statusColor'), 
      type: "color"
    },
    { 
      name: "priority" as const, 
      label: t('statusPriority'), 
      type: "number",
      placeholder: "1"
    },
  ];

  const fetchStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await statusService.fetchAll();
      setStatuses(response);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(t('fetchError'), {
          description: error.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const onSubmit = async (data: StatusFormData) => {
    setIsLoading(true);
    try {
      await statusService.create(data);

      toast.success(t('saveSuccess'), {
        description: t('statusSaveSuccess'),
      });
      
      fetchStatuses();
    } catch (error: unknown) {
      console.error('Status creation error:', error);
      if (error instanceof Error) {
        toast.error(t('saveError'), {
          description: error.message,
        });
      } else {
        toast.error(t('saveError'), {
          description: t('unexpectedError'),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await statusService.delete(id);

      toast.success(t('deleteSuccess'), {
        description: t('statusDeleteSuccess'),
      });

      fetchStatuses();
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('required relation reference')) {
          toast.error(t('deleteError'), {
            description: t('statusInUseError'),
          });
        } else {
          toast.error(t('deleteError'), {
            description: t('statusDeleteError'),
          });
        }
      }
    }
  };

  const handleEdit = async (status: StatusOptionsResponse) => {
    setEditingId(status.id);
  };

  const handleSave = async (status: StatusOptionsResponse, data: StatusFormData) => {
    console.log('Status - Starting save:', { status, data });
    try {
      const response = await statusService.update(status.id, data);
      console.log('Status - API Response:', response);
      
      if (!response.ok) throw new Error(t('statusUpdateError'));
      
      setEditingId(null);
      fetchStatuses();

      console.log('Status - About to show notification');
      toast.success(t('saveSuccess'), {
        description: t('statusUpdateSuccess'),
      });
      console.log('Status - After showing notification');
    } catch (error: unknown) {
      console.error('Status - Error occurred:', error);
      toast.error(t('saveError'), {
        description: error instanceof Error ? error.message : t('statusUpdateError'),
      });
      setEditingId(status.id);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsForm
        title={t('addStatus')}
        schema={statusSchema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        isLoading={isLoading}
        fields={fields}
      />

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('statuses')}</h3>
          <div className="space-y-4">
            {statuses.sort((a, b) => a.priority - b.priority).map((status) => (
              <div
                key={status.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  {editingId === status.id ? (
                    <>
                      <Input
                        type="color"
                        defaultValue={status.color}
                        className="w-12"
                        onBlur={(e) => handleSave(status, {...status, color: e.target.value})}
                      />
                      <Input
                        defaultValue={status.name}
                        className="w-32"
                        onBlur={(e) => handleSave(status, {...status, name: e.target.value})}
                      />
                      <Input
                        type="number"
                        defaultValue={status.priority}
                        className="w-20"
                        onBlur={(e) => handleSave(status, {...status, priority: parseInt(e.target.value)})}
                      />
                    </>
                  ) : (
                    <>
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="font-medium">{status.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {t('priority')}: {status.priority}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(status)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(status.id)}
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