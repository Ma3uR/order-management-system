"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SettingsForm } from "./SettingsForm";
import { statusSchema, type StatusFormData } from "@/app/lib/validations/settings";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { Trash2, Pencil, GripVertical, Search } from "lucide-react";
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

// Source IDs and mappings
const MARKETPLACE_SOURCES = {
  EPICENTR: 'pj9sejm9vqtu8xq',
  PROM_UA: 'gfzk8nxfokgu9ku',
  ROZETKA: '4tvf116a5aitwmb'
};

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

function SortableItem({ status, editingId, t, onEdit, onDelete, onSave }: SortableItemProps) {
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
          {status.marketplace_code && (
            <span className="text-xs text-muted-foreground">
              ({status.marketplace_code})
            </span>
          )}
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
  const [addingNew, setAddingNew] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Tab configuration
  const tabs = useMemo(() => [
    { name: "App", color: "#6366F1", key: 'app', sourceId: null },
    { name: "Rozetka", color: "#EF4444", key: 'rozetka', sourceId: MARKETPLACE_SOURCES.ROZETKA },
    { name: "Prom.ua", color: "#3B82F6", key: 'promua', sourceId: MARKETPLACE_SOURCES.PROM_UA },
    { name: "Epicentr", color: "#10B981", key: 'epicentr', sourceId: MARKETPLACE_SOURCES.EPICENTR }
  ], []);

  // Filter statuses by active tab and search query
  const filteredStatuses = useMemo(() => {
    const currentTab = tabs[activeTab];
    let tabStatuses = statuses.filter(status => {
      if (currentTab.key === 'app') {
        return !status.source || status.source === '';
      }
      return status.source === currentTab.sourceId;
    });

    if (searchQuery.trim()) {
      tabStatuses = tabStatuses.filter(status => 
        status.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return tabStatuses.sort((a, b) => a.priority - b.priority);
  }, [statuses, activeTab, searchQuery, tabs]);

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
      setStatuses(response.data);
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
      const currentTab = tabs[activeTab];
      const tabStatuses = statuses.filter(status => {
        if (currentTab.key === 'app') {
          return !status.source || status.source === '';
        }
        return status.source === currentTab.sourceId;
      });

      // Find the highest priority for the current tab
      const highestPriority = tabStatuses.reduce((max, status) => 
        Math.max(max, status.priority), 0);

      const hasDuplicatePriority = tabStatuses.some(status => status.priority === data.priority);
      if (hasDuplicatePriority) {
        throw new Error(t('duplicatePriorityError'));
      }

      // Create new status with source for current tab
      const statusData = {
        ...data,
        priority: highestPriority + 1,
        source: currentTab.sourceId || undefined
      };

      await createStatus(statusData);

      toast.success(t('saveSuccess'), {
        description: t('statusSaveSuccess'),
      });
      
      setAddingNew(false);
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
      const currentTab = tabs[activeTab];
      const tabStatuses = statuses.filter(s => {
        if (currentTab.key === 'app') {
          return !s.source || s.source === '';
        }
        return s.source === currentTab.sourceId;
      });

      const hasDuplicatePriority = tabStatuses.some(s => 
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
      
      // Calculate new priorities for all items in current tab
      const oldIndex = filteredStatuses.findIndex((item) => item.id === active.id);
      const newIndex = filteredStatuses.findIndex((item) => item.id === over.id);
      const reorderedItems = arrayMove(filteredStatuses, oldIndex, newIndex);
      
      // Update priorities based on new order
      const updatedStatuses = reorderedItems.map((status, index) => ({
        ...status,
        priority: index + 1
      }));

      // Update local state first for immediate feedback
      const newStatuses = statuses.map(status => {
        const updated = updatedStatuses.find(u => u.id === status.id);
        return updated || status;
      });
      setStatuses(newStatuses);

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

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold leading-none">{t('statuses')}</h3>
          <Button onClick={() => setAddingNew(true)} size="sm" disabled={addingNew} className="h-8 text-xs sm:text-sm px-2 sm:px-3">
            {t('addStatus')}
          </Button>
        </div>
        
        {/* Tabs */}
        <div className="relative overflow-hidden rounded-full bg-muted p-1 flex items-center">
          {tabs.map((tab, index) => (
            <button
              key={tab.name}
              className="text-xs font-semibold rounded-full w-full p-1 text-foreground z-20 transition-all whitespace-nowrap"
              onClick={() => setActiveTab(index)}
              style={{
                color: activeTab === index ? 'white' : 'inherit',
                fontWeight: activeTab === index ? 600 : 400
              }}
            >
              {tab.name}
            </button>
          ))}
          <div
            className="absolute inset-0 z-10 p-1"
            style={{
              width: `${100 / tabs.length}%`,
              transform: `translateX(${activeTab * 100}%)`,
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div 
              className="bg-accent rounded-full w-full h-full shadow-sm"
              style={{
                backgroundColor: tabs[activeTab].color,
                opacity: 0.9
              }}
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search statuses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
        
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="mt-2 text-xs sm:text-sm text-muted-foreground px-2 py-2 border-b flex items-center justify-between">
              <span>{t('dragToReorder')}</span>
              <span>
                {filteredStatuses.length} status{filteredStatuses.length !== 1 ? 'es' : ''}
              </span>
            </div>
            
            <div className="relative w-full">
              {/* Status list content */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={filteredStatuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y w-full">
                    {addingNew && (
                      <div className="p-2 bg-muted/20">
                        <SettingsForm
                          title={`${t('newStatus')} - ${tabs[activeTab].name}`}
                          schema={statusSchema}
                          onSubmit={onSubmit}
                          defaultValues={{ name: '', color: '#000000', priority: filteredStatuses.length + 1 }}
                          fields={fields}
                          className="space-y-2"
                          submitText={t('addStatus')}
                          onCancel={() => setAddingNew(false)}
                          isLoading={isLoading}
                        />
                      </div>
                    )}
                    
                    {filteredStatuses.length === 0 && !addingNew ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? 'No matching statuses found' : `No statuses in ${tabs[activeTab].name}`}
                      </div>
                    ) : (
                      filteredStatuses.map((status) => (
                        <SortableItem
                          key={status.id}
                          status={status}
                          editingId={editingId}
                          t={t}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onSave={handleSave}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}