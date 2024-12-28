import { useState, useCallback } from 'react';
import { OrdersRecord } from '@/app/types/pocketbase-types';

interface ValidationErrors {
  orderNumber?: string;
  source?: string;
  deliveryMethod?: string;
  deliveryPostNumber?: string;
  phoneNumber?: string;
  products?: string;
  paymentMethod?: string;
  fullName?: string;
  submit?: string;
}

interface ProductInput {
  title: string;
  quantity: number;
  price: number;
}

export function useOrderValidation() {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const validateOrder = async (orderData: Partial<OrdersRecord>, productInputs: ProductInput[]): Promise<boolean> => {
    const errors: ValidationErrors = {};
    let isValid = true;

    if (!orderData.orderNumber?.trim()) {
      errors.orderNumber = 'Order number is required';
      isValid = false;
    }

    if (!orderData.source) {
      errors.source = 'Source is required';
      isValid = false;
    }

    if (!orderData.deliveryMethod) {
      errors.deliveryMethod = 'Delivery method is required';
      isValid = false;
    }

    if (!orderData.phoneNumber?.match(/^\+?[0-9]{10,15}$/)) {
      errors.phoneNumber = 'Valid phone number is required';
      isValid = false;
    }

    if (!orderData.fullName?.trim()) {
      errors.fullName = 'Full name is required';
      isValid = false;
    }

    if (!productInputs.length || !productInputs.some(p => p.title && p.quantity > 0 && p.price > 0)) {
      errors.products = 'At least one valid product is required';
      isValid = false;
    }

    if (!orderData.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  return {
    validationErrors,
    validateOrder,
    clearValidationErrors
  };
} 