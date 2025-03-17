import { useState } from 'react';
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
  productionCost?: string;
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

    // Required field validations
    const requiredFields: Array<{ field: keyof OrdersRecord; message: string }> = [
      { field: 'orderNumber', message: 'Order number is required' },
      { field: 'source', message: 'Source is required' },
      { field: 'deliveryMethod', message: 'Delivery method is required' },
      { field: 'fullName', message: 'Full name is required' },
      { field: 'paymentMethod', message: 'Payment method is required' },
    ];

    requiredFields.forEach(({ field, message }) => {
      if (!orderData[field]?.toString().trim()) {
        errors[field as keyof ValidationErrors] = message;
        isValid = false;
      }
    });

    // Phone number validation
    if (!orderData.phoneNumber?.match(/^\+?[0-9]{10,15}$/)) {
      errors.phoneNumber = 'Valid phone number is required';
      isValid = false;
    }

    // Products validation
    if (!productInputs.length || !productInputs.some(p => p.title && p.quantity > 0 && p.price > 0)) {
      errors.products = 'At least one valid product is required';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  return {
    validationErrors,
    validateOrder,
    clearValidationErrors,
    hasErrors: Object.keys(validationErrors).length > 0
  };
} 