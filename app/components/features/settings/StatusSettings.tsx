"use client";


import { useState, useEffect, useCallback } from "react";
import { SettingsForm } from "./SettingsForm";
import { statusSchema, type StatusFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2, Pencil, GripVertical, ChevronDown, ChevronUp, Settings, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/shared/ui/collapsible";
import { Input } from "@/app/components/shared/ui/input";
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/shared/ui/popover";
import { cn } from "@/app/lib/utils";
import { ControllerRenderProps } from "react-hook-form";
import { motion } from "framer-motion";
import { createStatus, deleteStatus, getAllStatuses, updateStatus } from "@/app/[locale]/settings/actions/statuses";
import { StatusResponse } from "@/app/types/pocketbase-types";
import { StatusMapping } from "./StatusMapping";
type TranslationKeys = {
  priority: string;
  statusName: string;
  statusColor: string;
  statusPriority: string;
  saveSuccess: string;
  saveError: string;
  statusUpdateSuccess: string;
  statusUpdateError: string;
  statusOrderUpdateSuccess: string;
  statusOrderUpdateError: string;
  dragToReorder: string;
  fetchError: string;
  deleteSuccess: string;
  deleteError: string;
  statusDeleteSuccess: string;
  statusDeleteError: string;
  statusInUseError: string;
  unexpectedError: string;
  addStatus: string;
  statuses: string;
};

interface SortableItemProps {
  status: StatusResponse;
  editingId: string | null;
  t: (key: keyof TranslationKeys) => string;
  onEdit: (status: StatusResponse) => void;
  onDelete: (id: string) => void;
  onSave: (status: StatusResponse, data: StatusFormData) => void;
  onSettings: (status: StatusResponse) => void;
}

function ColorPicker({ 
  color, 
  onChange 
}: { 
  color: string; 
  onChange: (color: string) => void;
}) {
  const presetColors = [
    "#000000", "#EF4444", "#F97316", "#F59E0B", "#84CC16", 
    "#10B981", "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", 
    "#D946EF", "#EC4899", "#94A3B8"
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-[4rem] h-[2.5rem] border-2",
            "hover:border-ring hover:text-ring"
          )}
          style={{ 
            backgroundColor: color,
            borderColor: color,
          }}
        >
          <span className="sr-only">Pick a color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="grid grid-cols-5 gap-2">
          {presetColors.map((presetColor) => (
            <Button
              key={presetColor}
              variant="ghost"
              className={cn(
                "w-full h-8 rounded-md border-2",
                color === presetColor && "border-ring",
                "hover:border-ring hover:text-ring"
              )}
              style={{ 
                backgroundColor: presetColor,
                borderColor: presetColor === color ? presetColor : 'transparent',
              }}
              onClick={() => onChange(presetColor)}
            >
              <span className="sr-only">{presetColor}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SortableItem({ status, editingId, t, onEdit, onDelete, onSave, onSettings }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-background border rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          className="cursor-grab active:cursor-grabbing p-0 h-8 w-8 hover:bg-muted"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
        {editingId === status.id ? (
          <>
            <ColorPicker
              color={status.color}
              onChange={(color) => onSave(status, {...status, color})}
            />
            <Input
              defaultValue={status.name}
              className="w-32 bg-background"
              onBlur={(e) => {
                if (!e.target.value.trim()) {
                  e.target.value = status.name;
                  return;
                }
                onSave(status, {
                  ...status,
                  name: e.target.value.trim()
                });
              }}
            />
            <Input
              type="number"
              defaultValue={status.priority}
              className="w-20 bg-background"
              onBlur={(e) => onSave(status, {...status, priority: parseInt(e.target.value)})}
            />
          </>
        ) : (
          <>
            <div 
              className="w-4 h-4 rounded-full ring-1 ring-border" 
              style={{ backgroundColor: status.color }}
            />
            <span className="font-medium text-foreground">{status.name}</span>
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
          className="hover:bg-muted"
          onClick={() => onEdit(status)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-muted"
          onClick={() => onSettings(status)}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(status.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

type FormField = {
  name: keyof StatusFormData;
  label: string;
  type?: string;
  placeholder?: string;
  className?: string;
  render?: (props: { field: ControllerRenderProps<StatusFormData, keyof StatusFormData> }) => React.ReactNode;
};

export function StatusSettings() {
  const t = useTranslations('Settings');
  const [isLoading, setIsLoading] = useState(false);
  const [statuses, setStatuses] = useState<StatusResponse[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const defaultValues: StatusFormData = {
    name: "",
    color: "#000000",
    priority: 1
  };

  const fields: FormField[] = [
    { 
      name: "name" as const, 
      label: t('statusName'), 
      placeholder: t('statusNamePlaceholder'),
      className: "w-full"
    },
    { 
      name: "color" as const, 
      label: t('statusColor'), 
      type: "color",
      className: "w-full",
      render: ({ field }: { field: ControllerRenderProps<StatusFormData, keyof StatusFormData> }) => (
        <div className="flex flex-col gap-2">
          <ColorPicker
            color={typeof field.value === 'string' ? field.value : field.value?.toString() || '#000000'}
            onChange={field.onChange}
          />
        </div>
      )
    },
    { 
      name: "priority" as const,
      label: t('statusPriority'),
      type: "number",
      className: "w-full"
    }
  ];

  const fetchStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getAllStatuses();
      if (response.error || !response.data) throw new Error(response.error || 'No data returned');
      const sortedStatuses = [...response.data].sort((a, b) => a.priority - b.priority);
      setStatuses(sortedStatuses);
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
      // Find the highest priority
      const highestPriority = statuses.reduce((max, status) => 
        Math.max(max, status.priority), 0);

      const hasDuplicatePriority = statuses.some(status => status.priority === data.priority);
      if (hasDuplicatePriority) {
        throw new Error(t('duplicatePriorityError'));
      }

      // Create new status with next priority, overriding the form's priority
      await createStatus({
        ...data,
        priority: highestPriority + 1
      });

      toast.success(t('saveSuccess'), {
        description: t('statusSaveSuccess'),
      });
      
      fetchStatuses();
      setIsFormOpen(false);
    } catch (error: unknown) {
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
      await deleteStatus(id);

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

  const handleEdit = async (status: StatusResponse) => {
    setEditingId(status.id);
  };

  const handleSave = async (status: StatusResponse, data: StatusFormData) => {
    try {
      const hasDuplicatePriority = statuses.some(s => 
        s.priority === data.priority && s.id !== status.id
      );
      if (hasDuplicatePriority) {
        throw new Error(t('duplicatePriorityError')); 
      }

      const response = await updateStatus(status.id, data);
      
      if (response.error) throw new Error(response.error);
      
      setEditingId(null);
      fetchStatuses();

      toast.success(t('saveSuccess'), {
        description: t('statusUpdateSuccess'),
      });
    } catch (error: unknown) {
      toast.error(t('saveError'), {
        description: error instanceof Error ? error.message : t('statusUpdateError'),
      });
      setEditingId(status.id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Calculate new priorities for all items
      const oldIndex = statuses.findIndex((item) => item.id === active.id);
      const newIndex = statuses.findIndex((item) => item.id === over.id);
      const reorderedItems = arrayMove(statuses, oldIndex, newIndex);
      
      // Update local state first for immediate feedback
      const updatedStatuses = reorderedItems.map((status, index) => ({
        ...status,
        priority: index + 1  // Changed to use sequential numbers
      }));
      setStatuses(updatedStatuses);

      // Update the backend one by one in sequence
      for (const status of updatedStatuses) {
        const response = await updateStatus(status.id, {
          name: status.name,
          color: status.color,
          priority: status.priority
        });
        
        if (response.error) {
          throw new Error(response.error);
        }
      }

      toast.success(t('saveSuccess'), {
        description: t('statusOrderUpdateSuccess'),
      });
    } catch (error) {
      toast.error(t('saveError'), {
        description: error instanceof Error ? error.message : t('statusOrderUpdateError'),
      });
      
      // Fetch the original state from the server
      await fetchStatuses();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsClick = async (status: StatusResponse) => {
    setIsSettingsOpen(status.id);
  };

  const handleMappingChange = async (mappings: Record<string, string>) => {
    try {
      const status = statuses.find(s => s.id === isSettingsOpen);
      if (!status) return;

      const response = await updateStatus(status.id, {
        ...status,
        epicentrCode: mappings.epicentr,
        rozetkaCode: mappings.rozetka,
        promuaCode: mappings.promua
      });

      if (response.error) throw new Error(response.error);

      toast.success(t('saveSuccess'), {
        description: t('statusUpdateSuccess'),
      });

      fetchStatuses();
    } catch (error) {
      toast.error(t('saveError'), {
        description: error instanceof Error ? error.message : t('statusUpdateError'),
      });
    }
  };

  return (
    <div className="space-y-8">
    
      <Card className="border-none shadow-md">
        <CardContent className="p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Collapsible
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            className="space-y-1 pb-8"
          >
            <CollapsibleTrigger asChild>
              <motion.div 
                className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-2 rounded-md"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <h3 className="text-base font-medium">{t('addStatus')}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-9 p-0"
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: isFormOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isFormOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </motion.div>
                  <span className="sr-only">Toggle form</span>
                </Button>
              </motion.div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SettingsForm
                  title=""
                  schema={statusSchema}
                  defaultValues={defaultValues}
                  onSubmit={onSubmit}
                  isLoading={isLoading}
                  fields={fields}
                  className="pt-2"
                />
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>

          <h3 className="text-xl font-semibold mb-4">{t('statuses')}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t('dragToReorder')}</p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={statuses}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {statuses.map((status) => (
                  <SortableItem
                    key={status.id}
                    status={status}
                    editingId={editingId}
                    t={t}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSave={handleSave}
                    onSettings={handleSettingsClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {isSettingsOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={() => setIsSettingsOpen(null)}
        >
          <div 
            className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 sm:rounded-lg max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-2 border-b">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Status Mapping Settings</h2>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                  <div 
                    className="w-3 h-3 rounded-full ring-1 ring-border" 
                    style={{ 
                      backgroundColor: statuses.find(s => s.id === isSettingsOpen)?.color 
                    }} 
                  />
                  <span className="text-sm font-medium">
                    {statuses.find(s => s.id === isSettingsOpen)?.name}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 pt-4 overflow-y-auto max-h-[calc(90vh-4rem)]">
              <StatusMapping 
                currentStatus={statuses.find(s => s.id === isSettingsOpen) as StatusResponse}
                onChange={handleMappingChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}