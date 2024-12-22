"use client";

import { DefaultValues, useForm, Path, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { ZodSchema } from "zod";

interface SettingsFormProps<T> {
  schema: ZodSchema<T>;
  defaultValues: DefaultValues<T>;
  onSubmit: (data: T) => Promise<void>;
  isLoading: boolean;
  fields: Array<{
    name: keyof T;
    type?: string;
    label: string;
  }>;
  submitLabel: string;
}

export function SettingsForm<T extends FieldValues>({ 
  schema, 
  defaultValues,
  isLoading, 
  fields,
  submitLabel 
}: SettingsFormProps<T>) {
  const t = useTranslations('Settings');
  
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <Form<T> {...form}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <FormField<T>
            key={String(field.name)}
            control={form.control}
            name={field.name as Path<T>}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input 
                    type={field.type || "text"} 
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
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? t('saving') : submitLabel}
      </Button>
    </Form>
  );
}
