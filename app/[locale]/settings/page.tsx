'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
}

interface Status {
  id: string;
  name: string;
  color: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [email, setEmail] = useState(session?.user?.email || '');

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '' });
  const [newStatus, setNewStatus] = useState({ name: '', color: '#000000' });
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: '' });

  useEffect(() => {
    fetchCurrencies();
    fetchStatuses();
    fetchPaymentMethods();
  }, []);

  const fetchCurrencies = async () => {
    const response = await fetch('/api/currencies');
    const data = await response.json();
    setCurrencies(data);
  };

  const fetchStatuses = async () => {
    const response = await fetch('/api/statuses');
    const data = await response.json();
    setStatuses(data);
  };

  const fetchPaymentMethods = async () => {
    const response = await fetch('/api/payment-methods');
    const data = await response.json();
    setPaymentMethods(data);
  };

  const handleUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      if (!response.ok) throw new Error('Failed to update user');
      await update({
        ...session,
        user: {
          ...session?.user,
          name,
          email,
        },
      });
      alert(t('settingsUpdated'));
    } catch (error) {
      console.error('Error updating settings:', error);
      alert(t('updateError'));
    }
  };

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCurrency),
      });
      if (!response.ok) throw new Error('Failed to add currency');
      const addedCurrency = await response.json();
      setCurrencies([...currencies, addedCurrency]);
      setNewCurrency({ code: '', name: '', symbol: '' });
    } catch (error) {
      console.error('Error adding currency:', error);
      alert(t('addError'));
    }
  };

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStatus),
      });
      if (!response.ok) throw new Error('Failed to add status');
      const addedStatus = await response.json();
      setStatuses([...statuses, addedStatus]);
      setNewStatus({ name: '', color: '#000000' });
    } catch (error) {
      console.error('Error adding status:', error);
      alert(t('addError'));
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPaymentMethod),
      });
      if (!response.ok) throw new Error('Failed to add payment method');
      const addedPaymentMethod = await response.json();
      setPaymentMethods([...paymentMethods, addedPaymentMethod]);
      setNewPaymentMethod({ name: '' });
    } catch (error) {
      console.error('Error adding payment method:', error);
      alert(t('addError'));
    }
  };

  const handleDeleteStatus = async (id: string) => {
    try {
      const response = await fetch('/api/statuses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Failed to delete status');
      setStatuses(statuses.filter(status => status.id !== id));
    } catch (error) {
      console.error('Error deleting status:', error);
      alert(t('deleteError'));
    }
  };

  const handleDeleteCurrency = async (id: string) => {
    try {
      const response = await fetch('/api/currencies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Failed to delete currency');
      setCurrencies(currencies.filter(currency => currency.id !== id));
    } catch (error) {
      console.error('Error deleting currency:', error);
      alert(t('deleteError'));
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Failed to delete payment method');
      setPaymentMethods(paymentMethods.filter(method => method.id !== id));
    } catch (error) {
      console.error('Error deleting payment method:', error);
      alert(t('deleteError'));
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t('profile')}</TabsTrigger>
          <TabsTrigger value="currencies">{t('currencies')}</TabsTrigger>
          <TabsTrigger value="statuses">{t('statuses')}</TabsTrigger>
          <TabsTrigger value="paymentMethods">{t('paymentMethods')}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <form onSubmit={handleUserUpdate} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t('name')}
              </label>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('email')}
              </label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit">{t('saveChanges')}</Button>
          </form>
        </TabsContent>
        <TabsContent value="currencies">
          <form onSubmit={handleAddCurrency} className="space-y-4 mb-4">
            <Input
              placeholder={t('currencyCode')}
              value={newCurrency.code}
              onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })}
            />
            <Input
              placeholder={t('currencyName')}
              value={newCurrency.name}
              onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
            />
            <Input
              placeholder={t('currencySymbol')}
              value={newCurrency.symbol}
              onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
            />
            <Button type="submit">{t('addCurrency')}</Button>
          </form>
          <ul>
            {currencies.map((currency) => (
              <li key={currency.id} className="flex justify-between items-center mb-2">
                <span>{currency.name} ({currency.code}) {currency.symbol}</span>
                <span>{currency.isDefault ? t('default') : ''}</span>
                <button onClick={() => handleDeleteCurrency(currency.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="statuses">
          <form onSubmit={handleAddStatus} className="space-y-4 mb-4">
            <Input
              placeholder={t('statusName')}
              value={newStatus.name}
              onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
            />
            <Input
              type="color"
              value={newStatus.color}
              onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
            />
            <Button type="submit">{t('addStatus')}</Button>
          </form>
          <ul>
            {statuses.map((status) => (
              <li key={status.id} className="flex justify-between items-center mb-2">
                <span>{status.name}</span>
                <span style={{ backgroundColor: status.color, width: '20px', height: '20px' }}></span>
                <button onClick={() => handleDeleteStatus(status.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="paymentMethods">
          <form onSubmit={handleAddPaymentMethod} className="space-y-4 mb-4">
            <Input
              placeholder={t('paymentMethodName')}
              value={newPaymentMethod.name}
              onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, name: e.target.value })}
            />
            <Button type="submit">{t('addPaymentMethod')}</Button>
          </form>
          <ul>
            {paymentMethods.map((method) => (
              <li key={method.id} className="flex justify-between items-center mb-2">
                <span>{method.name}</span>
                <button onClick={() => handleDeletePaymentMethod(method.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
