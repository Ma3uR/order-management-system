import { CurrencyFormData, PaymentMethodFormData, StatusFormData, SourceFormData } from "../lib/validations/settings";
import { DeliveryMethodFormData } from "../lib/validations/settings";
// Create a service layer
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const currencyService = {
  async fetchAll() {
    const url = new URL('/api/currencies', BASE_URL).toString()
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  create: (data: CurrencyFormData) => fetch('/api/currencies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetch(`/api/currencies/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  }),
}; 

export const deliveryService = {
  async fetchAll() {
    const url = new URL('/api/delivery-methods', BASE_URL).toString()
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  create: (data: DeliveryMethodFormData) => fetch('/api/delivery-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetch(`/api/delivery-methods/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  }),
};

export const statusService = {
  async fetchAll() {
    const url = new URL('/api/statuses', BASE_URL).toString()
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  update: (id: string, data: StatusFormData) => fetch(`/api/statuses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  create: (data: StatusFormData) => fetch('/api/statuses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetch(`/api/statuses/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  }),
};

export const paymentService = {
  async fetchAll() {
    const url = new URL('/api/payment-methods', BASE_URL).toString()
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  create: (data: PaymentMethodFormData) => fetch('/api/payment-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetch(`/api/payment-methods/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  }),
};

export const sourceService = {
    async fetchAll() {
      const url = new URL('/api/sources', BASE_URL).toString()
      const response = await fetch(url, {
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
    delete: (id: string) => fetch(`/api/sources/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }),
};
