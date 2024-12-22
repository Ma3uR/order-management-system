import { CurrencyFormData, PaymentMethodFormData, StatusFormData, SourceFormData } from "../lib/validations/settings";
import { DeliveryMethodFormData } from "../lib/validations/settings";
// Create a service layer
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const currencyService = {
  fetchAll: () => fetch('/api/currencies').then(res => res.json()),
  create: (data: CurrencyFormData) => fetch('/api/currencies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetch(`/api/currencies`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }),
}; 

export const deliveryService = {
  fetchAll: () => fetch('/api/delivery-methods').then(res => res.json()),
  create: (data: DeliveryMethodFormData) => fetch('/api/delivery-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetch(`/api/delivery-methods`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }),
};

export const statusService = {
  fetchAll: () => fetch('/api/statuses').then(res => res.json()),
  create: (data: StatusFormData) => fetch('/api/statuses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetch(`/api/statuses`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }),
};

export const paymentService = {
  fetchAll: () => fetch('/api/payment-methods').then(res => res.json()),
  create: (data: PaymentMethodFormData) => fetch('/api/payment-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetch(`/api/payment-methods`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }),
};

export const sourceService = {
    async fetchAll() {
      const response = await fetch(`${BASE_URL}/api/sources`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    create: (data: SourceFormData) => fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    delete: (id: string) => fetch(`/api/sources`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }),
};
