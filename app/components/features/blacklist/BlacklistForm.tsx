"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { UserX } from "lucide-react";

import { blacklistEntrySchema, type BlacklistFormData } from "@/app/lib/validations/blacklist";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { Textarea } from "@/app/components/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/shared/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/app/components/shared/ui/form";

const formVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

const fieldVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

interface BlacklistFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BlacklistFormData) => Promise<void>;
  isLoading: boolean;
}

export function BlacklistForm({ isOpen, onClose, onSubmit, isLoading }: BlacklistFormProps) {
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

  const handleSubmit = async (data: BlacklistFormData) => {
    try {
      await onSubmit(data);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 opacity-100">
            <motion.div
              variants={formVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <UserX className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl text-gray-900 dark:text-gray-100">{t('addToBlacklist')}</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                      {t('addToBlacklistDescription')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
                  <motion.div 
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    variants={{
                      animate: {
                        transition: {
                          staggerChildren: 0.1
                        }
                      }
                    }}
                  >
                    {/* Full Name */}
                    <motion.div variants={fieldVariants} className="sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('fullNamePlaceholder')}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={t('enterFullName')}
                                className="h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    {/* Phone Number */}
                    <motion.div variants={fieldVariants}>
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('phoneNumberPlaceholder')}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="+380XXXXXXXXX"
                                className="h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                    {/* City */}
                    <motion.div variants={fieldVariants}>
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('cityPlaceholder')}</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={t('enterCity')}
                                className="h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>


                    {/* Total Order Sum */}
                    <motion.div variants={fieldVariants}>
                      <FormField
                        control={form.control}
                        name="totalOrderSum"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('totalOrderSumPlaceholder')}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={e => field.onChange(Number(e.target.value) || 0)}
                                placeholder="0"
                                className="h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-gray-500 dark:text-gray-400">
                              {t('orderSumDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>

                  </motion.div>

                  {/* Notes */}
                  <motion.div variants={fieldVariants}>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('notesPlaceholder')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder={t('enterReason')}
                              className="min-h-[80px] resize-none bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-gray-500 dark:text-gray-400">
                            {t('notesDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <DialogFooter>
                    <motion.div 
                      className="flex gap-3 w-full sm:w-auto"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="flex-1 sm:flex-none"
                      >
                        {t('cancel')}
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="flex-1 sm:flex-none min-w-[120px]"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {t('adding')}
                          </div>
                        ) : (
                          t('addToBlacklist')
                        )}
                      </Button>
                    </motion.div>
                  </DialogFooter>
                </form>
              </Form>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
} 