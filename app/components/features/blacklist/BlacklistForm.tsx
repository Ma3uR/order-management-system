"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blacklistEntrySchema, type BlacklistFormData } from "@/app/lib/validations/blacklist";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { useTranslations } from "next-intl";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/shared/ui/form";
import { motion } from "framer-motion";

const formFields = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

interface BlacklistFormProps {
  onSubmit: (data: BlacklistFormData) => Promise<void>;
  isLoading: boolean;
}

export function BlacklistForm({ onSubmit, isLoading }: BlacklistFormProps) {
  const t = useTranslations('Blacklist');
  const form = useForm<BlacklistFormData>({
    resolver: zodResolver(blacklistEntrySchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      city: '',
      totalOrderSum: 0,
      notes: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          initial="initial"
          animate="animate"
          variants={{
            animate: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          <motion.div variants={formFields}>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fullNamePlaceholder')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
          
          <motion.div variants={formFields}>
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('phoneNumberPlaceholder')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div variants={formFields}>
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cityPlaceholder')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
          
          <motion.div variants={formFields}>
            <FormField
              control={form.control}
              name="totalOrderSum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('totalOrderSumPlaceholder')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={e => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        </motion.div>

        <motion.div 
          variants={formFields}
          initial="initial"
          animate="animate"
        >
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('notesPlaceholder')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('adding') : t('addToBlacklist')}
          </Button>
        </motion.div>
      </form>
    </Form>
  );
} 