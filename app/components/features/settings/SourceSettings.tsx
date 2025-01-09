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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/shared/ui/collapsible";
import { Input } from "@/app/components/shared/ui/input";
import { motion, AnimatePresence } from 'framer-motion';
import { createSource, deleteSource } from "@/app/actions/sources";
import { getAllSources } from "@/app/actions/sources";
import { updateSource } from "@/app/actions/sources";

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
  };


  const handleSave = async (id: string, data: { name: string; url?: string | undefined; }) => {
    try {
      await updateSource(id, data);
      toast.success(t('updateSuccess'), {
        description: t('sourceUpdateSuccess'),
      });
      const updatedSources = await getAllSources();
      setSources(updatedSources.data || []);
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
    <motion.div 
      className="space-y-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={fadeIn}>
        <Card className="border bg-card">
          <CardContent className="pt-6">
            <Collapsible
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              className="space-y-1"
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-2 rounded-md">
                  <h3 className="text-base font-medium">{t('addSource')}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-9 p-0"
                  >
                    {isFormOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle form</span>
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
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
                  className="pt-2"
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-6">
              <AnimatePresence mode="popLayout">
                <motion.div 
                  className="space-y-2"
                  variants={staggerContainer}
                >
                  {sources.map((source) => (
                    <motion.div
                      key={source.id}
                      variants={listItem}
                      layout
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50"
                    >
                      <div className="flex-1 min-w-0">
                        {editingId === source.id ? (
                          <Input
                            defaultValue={source.name}
                            className="max-w-[200px]"
                            onBlur={(e) => {
                              if (!e.target.value.trim()) {
                                e.target.value = source.name || '';
                                return;
                              }
                              handleSave(source.id, { name: e.target.value.trim() });
                            }}
                          />
                        ) : (
                          <span className="font-medium">{source.name}</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-muted"
                          onClick={() => handleEdit(source)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(source.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}