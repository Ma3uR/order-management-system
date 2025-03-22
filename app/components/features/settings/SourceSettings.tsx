"use client";

import { useState, useEffect } from "react";
import { SettingsForm } from "./SettingsForm";
import { sourceSchema } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import type { SourcesResponse } from "@/app/types/pocketbase-types";
import { toast } from 'sonner';
import { Input } from "@/app/components/shared/ui/input";
import { motion, AnimatePresence } from 'framer-motion';
import { createSource, deleteSource } from "@/app/[locale]/settings/actions/sources";
import { getAllSources } from "@/app/[locale]/settings/actions/sources";
import { updateSource } from "@/app/[locale]/settings/actions/sources";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.2 }
};

const listItem = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.2 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

export function SourceSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<SourcesResponse[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editedName, setEditedName] = useState<string>("");
  const [editedUrl, setEditedUrl] = useState<string | undefined>(undefined);

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
        const data = await getAllSources();
        if (data.error) {
          throw new Error(data.error);
        }
        setSources(data.data || []);
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
    setEditedName(source.name || "");
    setEditedUrl(source.url);
  };

  const handleSave = async (id: string) => {
    try {
      // Find the source being edited
      const source = sources.find(src => src.id === id);
      if (!source) return;
      
      await updateSource(id, {
        name: editedName,
        url: editedUrl || ""
      });
      toast.success(t('updateSuccess'), {
        description: t('sourceUpdateSuccess'),
      });
      const updatedSources = await getAllSources();
      setSources(updatedSources.data || []);
      setEditingId(null); // Exit edit mode after saving
    } catch (error) {
      console.error('Error updating source:', error);
      toast.error(t('updateError'), {
        description: t('sourceUpdateError'),
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSource(id);
      toast.success(t('deleteSuccess'), {
        description: t('sourceDeleteSuccess'),
      });
      const updatedSources = await getAllSources();
      setSources(updatedSources.data || []);
    } catch (error) {
      console.error('Error deleting source:', error);
      toast.error(t('deleteError'), {
        description: t('sourceDeleteError'),
      });
    }
  };

  if (isLoading && sources.length === 0) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-[200px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </motion.div>
    );
  }

  return (
    <div className="w-full space-y-4 overflow-hidden">
      <motion.div 
        className="space-y-4"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          variants={fadeIn}
        >
          <h3 className="text-lg font-semibold leading-none">{t('sources')}</h3>
          <Button
            onClick={() => setIsFormOpen(!isFormOpen)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isFormOpen ? t('cancel') : t('addSource')}
            {isFormOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </motion.div>

        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SettingsForm
                title=""
                schema={sourceSchema}
                defaultValues={{}}
                onSubmit={async (data) => {
                  try {
                    setIsLoading(true);
                    const result = await createSource(data);
                    if (result.error) {
                      throw new Error(result.error);
                    }
                    toast.success(t('createSuccess'), {
                      description: t('sourceCreateSuccess'),
                    });
                    const updatedSources = await getAllSources();
                    if (updatedSources.error) {
                      throw new Error(updatedSources.error);
                    }
                    setSources(updatedSources.data || []);
                    setIsFormOpen(false);
                    setIsLoading(false);
                  } catch (error) {
                    console.error('Error creating source:', error);
                    setIsLoading(false);
                  }
                }}
                isLoading={isLoading}
                fields={fields}
                className="p-0"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={fadeIn}
          className="w-full overflow-hidden"
        >
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y">
                {!sources.length && !isLoading && (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('noSourcesFound')}
                  </div>
                )}
                
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="divide-y"
                >
                  {sources.map(source => (
                    <motion.div
                      key={source.id}
                      variants={listItem}
                      layout
                      className="p-4"
                    >
                      {editingId === source.id ? (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3">
                            <div>
                              <label className="text-sm font-medium">{t('sourceName')}</label>
                              <Input
                                type="text"
                                defaultValue={source.name}
                                className="mt-1 w-full"
                                onChange={(e) => setEditedName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">{t('sourceUrl')}</label>
                              <Input
                                type="text"
                                defaultValue={source.url || ''}
                                className="mt-1 w-full"
                                onChange={(e) => setEditedUrl(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => setEditingId(null)}
                            >
                              {t('cancel')}
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => handleSave(source.id)}
                            >
                              {t('save')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="font-medium">{source.name}</h4>
                            {source.url && (
                              <p className="text-sm text-muted-foreground break-all">
                                {source.url}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(source)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon" 
                              onClick={() => handleDelete(source.id)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}