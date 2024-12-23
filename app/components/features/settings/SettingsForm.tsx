"use client";

import { useForm, FieldValues, DefaultValues, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/shared/ui/form";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { useTranslations } from "next-intl";
import { ZodSchema } from "zod";

interface SettingsFormProps<T extends FieldValues> {
  title: string;
  schema: ZodSchema<T>;
  defaultValues: DefaultValues<T>;
  onSubmit: (data: T) => Promise<void>;
  isLoading: boolean;
  fields: Array<{
    name: keyof T;
    type?: string;
    label: string;
    placeholder?: string;
  }>;
}

export function SettingsForm<T extends FieldValues>({ 
  title,
  schema, 
  defaultValues, 
  onSubmit, 
  isLoading, 
  fields 
}: SettingsFormProps<T>) {
  const t = useTranslations('Settings');
  
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <FormField
                  key={String(field.name)}
                  control={form.control}
                  name={field.name as Path<T>}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        {field.label}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type={field.type || "text"} 
                          placeholder={field.placeholder}
                          className="h-9 border rounded-md px-3"
                          {...formField} 
                          onChange={e => {
                            if (field.type === "number") {
                              formField.onChange(Number(e.target.value));
                            } else {
                              formField.onChange(e.target.value);
                            }
                          }}
                        />
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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? t('saving') : t('save')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 