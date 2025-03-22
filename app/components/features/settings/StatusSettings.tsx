"use client";


import { useState, useEffect, useCallback } from "react";
import { SettingsForm } from "./SettingsForm";
import { statusSchema, type StatusFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2, Pencil, GripVertical, Settings, X } from "lucide-react";
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
  editStatus: string;
  newStatus: string;
};

interface SortableItemProps {
  status: StatusResponse;
  editingId: string | null;
  t: (key: keyof TranslationKeys) => string;
  onEdit: (status: StatusResponse | null) => void;
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

  const isEditing = editingId === status.id;

  // Get fields from parent component
  const fields: FormField[] = [
    { 
      name: "name" as const, 
      label: t('statusName'), 
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

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="p-2 bg-muted/20">
        <SettingsForm
          title={t('editStatus')}
          schema={statusSchema}
          onSubmit={async (data) => {
            await onSave(status, data);
          }}
          defaultValues={{
            name: status.name,
            color: status.color,
            priority: status.priority,
          }}
          fields={fields}
          className="space-y-2"
          submitText={t('saveSuccess')}
          onCancel={() => onEdit(null)}
          isLoading={false}
        />
      </div>
    );
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center p-2 gap-2 overflow-hidden",
        isDragging && "bg-accent/50"
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center gap-1 w-full sm:w-auto overflow-hidden">
        <div
          className="cursor-grab touch-none flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex items-center gap-1 overflow-hidden">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: status.color }}
          />
          <span className="text-sm font-medium truncate">{status.name}</span>
        </div>
      </div>
      
      <div className="ml-auto flex items-center justify-end gap-1 mt-2 sm:mt-0 flex-shrink-0">
        <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap mr-1">
          {t('priority')}: {status.priority}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(status)}
          className="h-7 w-7 flex-shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit</span>
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSettings(status)}
          className="h-7 w-7 flex-shrink-0"
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="sr-only">Settings</span>
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(status.id)}
          className="h-7 w-7 flex-shrink-0 text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </motion.div>
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
  const [isSettingsOpen, setIsSettingsOpen] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fields: FormField[] = [
    { 
      name: "name" as const, 
      label: t('statusName'), 
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

  const handleEdit = async (status: StatusResponse | null) => {
    if (status) {
      setEditingId(status.id);
    } else {
      setEditingId(null);
    }
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
    <div className="space-y-4 w-full">
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold leading-none">{t('statuses')}</h3>
          <Button onClick={() => setAddingNew(true)} size="sm" disabled={addingNew} className="h-8 text-xs sm:text-sm px-2 sm:px-3">
            {t('addStatus')}
          </Button>
        </div>
        
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="mt-2 text-xs sm:text-sm text-muted-foreground px-2 py-2 border-b">
              {t('dragToReorder')}
            </div>
            
            <div className="relative w-full">
              {/* Status list content */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={statuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y w-full">
                    {addingNew && (
                      <div className="p-2 bg-muted/20">
                        <SettingsForm
                          title={t('newStatus')}
                          schema={statusSchema}
                          onSubmit={onSubmit}
                          defaultValues={{ name: '', color: '#000000', priority: statuses.length + 1 }}
                          fields={fields}
                          className="space-y-2"
                          submitText={t('addStatus')}
                          onCancel={() => setAddingNew(false)}
                          isLoading={isLoading}
                        />
                      </div>
                    )}
                    
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
            </div>
          </CardContent>
        </Card>
      </div>

      {isSettingsOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={() => setIsSettingsOpen(null)}
        >
          <div 
            className="fixed left-[50%] top-[50%] z-50 w-[85%] max-w-xs sm:max-w-md md:max-w-lg translate-x-[-50%] translate-y-[-50%] gap-2 border bg-background shadow-lg duration-200 sm:rounded-lg max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b">
              <div className="flex flex-col md:flex-row md:items-center gap-1">
                <h2 className="text-base font-semibold truncate">Status Mapping</h2>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded-md">
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ 
                      backgroundColor: statuses.find(s => s.id === isSettingsOpen)?.color 
                    }} 
                  />
                  <span className="text-xs font-medium truncate">
                    {statuses.find(s => s.id === isSettingsOpen)?.name}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSettingsOpen(null)}
                className="h-7 w-7 flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-2 overflow-y-auto">
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