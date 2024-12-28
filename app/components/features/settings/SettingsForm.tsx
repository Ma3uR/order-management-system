"use client";

import { useForm, FieldValues, DefaultValues, Path, UseFormReturn, ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/shared/ui/form";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { Card, CardContent } from "@/app/components/shared/ui/card";
import { useTranslations } from "next-intl";
import { ZodSchema } from "zod";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/shared/ui/popover";
import { cn } from "@/app/lib/utils";

interface SettingsFormProps<T extends FieldValues> {
  title: string;
  schema: ZodSchema<T>;
  form?: UseFormReturn<T>;
  defaultValues?: DefaultValues<T>;
  onSubmit: (data: T) => Promise<void>;
  isLoading: boolean;
  fields: Array<{
    name: keyof T;
    type?: string;
    label: string;
    placeholder?: string;
    className?: string;
    render?: (props: { field: ControllerRenderProps<T, Path<T>> }) => React.ReactNode;
  }>;
  className?: string;
}

export function ColorPicker({ 
  value, 
  onChange 
}: { 
  value: string;
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
            backgroundColor: value,
            borderColor: value,
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
                value === presetColor && "border-ring",
                "hover:border-ring hover:text-ring"
              )}
              style={{ 
                backgroundColor: presetColor,
                borderColor: presetColor === value ? presetColor : 'transparent',
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

export function SettingsForm<T extends FieldValues>({ 
  schema, 
  form: externalForm,
  defaultValues, 
  onSubmit, 
  isLoading, 
  fields,
  className 
}: SettingsFormProps<T>) {
  const t = useTranslations('Settings');
  
  const internalForm = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  
  const form = externalForm || internalForm;

  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
      if (!externalForm) {
        form.reset();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
    }
  };

  return (
    <Card className="bg-card border-none shadow-md">
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-6", className)}>
            <div className="grid gap-6 sm:grid-cols-2">
              {fields.map((field) => (
                <FormField
                  key={String(field.name)}
                  control={form.control}
                  name={field.name as Path<T>}
                  render={({ field: formField }) => (
                    <FormItem className={field.className}>
                      <FormLabel className="text-sm font-medium">
                        {field.label}
                      </FormLabel>
                      <FormControl>
                        {field.render ? (
                          field.render({ field: formField })
                        ) : (
                          <Input 
                            type={field.type || "text"} 
                            placeholder={field.placeholder}
                            className="h-9 border rounded-md px-3 bg-background"
                            {...formField} 
                            onChange={e => {
                              if (field.type === "number") {
                                formField.onChange(Number(e.target.value));
                              } else {
                                formField.onChange(e.target.value);
                              }
                            }}
                          />
                        )}
                      </FormControl>
                      <FormMessage className="text-sm text-destructive" />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? t('saving') : t('save')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 