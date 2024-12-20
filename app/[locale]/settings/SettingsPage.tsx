'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { PlusCircle, Trash2, Edit2 } from 'lucide-react';
import { Label } from "@/components/ui/label";
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  priority: number;
}

interface PaymentMethod {
  id: string;
  name: string;
}

interface DeliveryMethod {
  id: string;
  name: string;
}

interface Source {
  id: string;
  name: string;
  url?: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [email, setEmail] = useState(session?.user?.email || '');

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '' });
  const [newStatus, setNewStatus] = useState({ 
    name: '', 
    color: '#000000',
    priority: 1
  });
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: '' });
  const [newDeliveryMethod, setNewDeliveryMethod] = useState({ name: '' });
  const [newSource, setNewSource] = useState({ name: '', url: '' });

  const [flashMessage, setFlashMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [editStatusValues, setEditStatusValues] = useState({ 
    name: '', 
    color: '#000000',
    priority: 1
  });

  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [editPaymentMethodValue, setEditPaymentMethodValue] = useState('');

  const [editingDeliveryMethod, setEditingDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [editDeliveryMethodValue, setEditDeliveryMethodValue] = useState('');

  const fetchCurrencies = async () => {
    try {
      const response = await fetch('/api/currencies');
      const data = await response.json();
      setCurrencies(data);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      showFlashMessage(t('updateError'), 'error');
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await fetch('/api/statuses');
      const data = await response.json();
      setStatuses(data);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      showFlashMessage(t('updateError'), 'error');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payment-methods');
      const data = await response.json();
      setPaymentMethods(data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      showFlashMessage(t('updateError'), 'error');
    }
  };

  const fetchDeliveryMethods = async () => {
    try {
      const response = await fetch('/api/delivery-methods');
      const data = await response.json();
      if (Array.isArray(data)) {
        setDeliveryMethods(data);
      }
    } catch (error) {
      console.error('Error fetching delivery methods:', error);
      showFlashMessage(t('updateError'), 'error');
    }
  };

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources');
      if (!response.ok) throw new Error('Failed to fetch sources');
      const data = await response.json();
      setSources(data);
    } catch (error) {
      console.error('Error fetching sources:', error);
      showFlashMessage(t('updateError'), 'error');
    }
  };

  useEffect(() => {
    fetchCurrencies();
    fetchStatuses();
    fetchPaymentMethods();
    fetchDeliveryMethods();
    fetchSources();
  }, []);

  // Add all your fetch functions and handlers here
  const showFlashMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
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
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showFlashMessage(t('updateError'), 'error');
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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add currency');
      }
      const addedCurrency = await response.json();
      setCurrencies([...currencies, addedCurrency]);
      setNewCurrency({ code: '', name: '', symbol: '' });
      showFlashMessage('Currency added successfully!', 'success');
    } catch (error) {
      console.error('Error adding currency:', error);
      showFlashMessage(error instanceof Error ? error.message : 'An error occurred', 'error');
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
      showFlashMessage('Currency deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting currency:', error);
      showFlashMessage('Error deleting currency', 'error');
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to add status');
      }
      
      const addedStatus = await response.json();
      setStatuses([...statuses, addedStatus]);
      setNewStatus({ name: '', color: '#000000', priority: 1 });
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error adding status:', error);
      showFlashMessage(error instanceof Error ? error.message : t('addError'), 'error');
    }
  };

  const handleDeleteStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/statuses/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete status');
      }
      
      setStatuses(statuses.filter(status => status.id !== id));
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error deleting status:', error);
      showFlashMessage(error instanceof Error ? error.message : t('deleteError'), 'error');
    }
  };

  const handleEditStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatus) return;

    try {
      const response = await fetch(`/api/statuses/${editingStatus.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editStatusValues),
      });
      if (!response.ok) throw new Error('Failed to update status');
      const updatedStatus = await response.json();
      setStatuses(statuses.map(status => 
        status.id === updatedStatus.id ? updatedStatus : status
      ));
      setEditingStatus(null);
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showFlashMessage(t('updateError'), 'error');
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
      const addedMethod = await response.json();
      setPaymentMethods([...paymentMethods, addedMethod]);
      setNewPaymentMethod({ name: '' });
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error adding payment method:', error);
      showFlashMessage(t('addError'), 'error');
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const response = await fetch(`/api/payment-methods/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete payment method');
      setPaymentMethods(paymentMethods.filter(method => method.id !== id));
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error deleting payment method:', error);
      showFlashMessage(t('deleteError'), 'error');
    }
  };

  const handleAddDeliveryMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/delivery-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeliveryMethod),
      });
      if (!response.ok) throw new Error('Failed to add delivery method');
      const addedMethod = await response.json();
      setDeliveryMethods([...deliveryMethods, addedMethod]);
      setNewDeliveryMethod({ name: '' });
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error adding delivery method:', error);
      showFlashMessage(t('addError'), 'error');
    }
  };

  const handleDeleteDeliveryMethod = async (id: string) => {
    try {
      const response = await fetch(`/api/delivery-methods/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete delivery method');
      setDeliveryMethods(deliveryMethods.filter(method => method.id !== id));
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error deleting delivery method:', error);
      showFlashMessage(t('deleteError'), 'error');
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource),
      });
      if (!response.ok) throw new Error('Failed to add source');
      const addedSource = await response.json();
      setSources([...sources, addedSource]);
      setNewSource({ name: '', url: '' });
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error adding source:', error);
      showFlashMessage(t('addError'), 'error');
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete source');
      }
      
      setSources(sources.filter(source => source.id !== id));
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error deleting source:', error);
      showFlashMessage(error instanceof Error ? error.message : t('deleteError'), 'error');
    }
  };

  const handleEditPaymentMethod = (method: PaymentMethod) => {
    setEditingPaymentMethod(method);
    setEditPaymentMethodValue(method.name);
  };

  const handleUpdatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentMethod) return;

    try {
      const response = await fetch(`/api/payment-methods/${editingPaymentMethod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editPaymentMethodValue }),
      });
      if (!response.ok) throw new Error('Failed to update payment method');
      const updatedMethod = await response.json();
      setPaymentMethods(paymentMethods.map(method => 
        method.id === updatedMethod.id ? updatedMethod : method
      ));
      setEditingPaymentMethod(null);
      setEditPaymentMethodValue('');
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error updating payment method:', error);
      showFlashMessage(t('updateError'), 'error');
    }
  };

  const handleEditDeliveryMethod = (method: DeliveryMethod) => {
    setEditingDeliveryMethod(method);
    setEditDeliveryMethodValue(method.name);
  };

  const handleUpdateDeliveryMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeliveryMethod) return;

    try {
      const response = await fetch(`/api/delivery-methods/${editingDeliveryMethod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editDeliveryMethodValue }),
      });
      if (!response.ok) throw new Error('Failed to update delivery method');
      const updatedMethod = await response.json();
      setDeliveryMethods(deliveryMethods.map(method => 
        method.id === updatedMethod.id ? updatedMethod : method
      ));
      setEditingDeliveryMethod(null);
      setEditDeliveryMethodValue('');
      showFlashMessage(t('settingsUpdated'), 'success');
    } catch (error) {
      console.error('Error updating delivery method:', error);
      showFlashMessage(t('updateError'), 'error');
    }
  };

  return (
    <div className="p-4 sm:p-8 dark:text-gray-100">
      <div className="flex flex-col gap-4 sm:gap-6 mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        <Link href="/dashboard" className="text-blue-500 dark:text-blue-400 hover:underline">
          {t('backToDashboard')}
        </Link>
      </div>
      {flashMessage && (
        <div className={`mb-4 p-2 rounded ${
          flashMessage.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' 
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
        }`}>
          {flashMessage.message}
        </div>
      )}
      <div className="space-y-4">
        <Tabs defaultValue="profile">
          <TabsList className="overflow-x-auto bg-gray-100 dark:bg-gray-800">
            <div className="grid min-w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
              <TabsTrigger value="profile" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-100">{t('profile')}</TabsTrigger>
              <TabsTrigger value="currencies" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-100">{t('currencies')}</TabsTrigger>
              <TabsTrigger value="statuses" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-100">{t('statuses')}</TabsTrigger>
              <TabsTrigger value="paymentMethods" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-100">{t('paymentMethods')}</TabsTrigger>
              <TabsTrigger value="deliveryMethods" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-100">{t('deliveryMethods')}</TabsTrigger>
              <TabsTrigger value="sources" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-100">{t('sources')}</TabsTrigger>
            </div>
          </TabsList>
          <TabsContent value="profile">
            <form onSubmit={handleUserUpdate} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
              <div className="flex space-x-2">
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
                <Button type="submit">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {t('addCurrency')}
                </Button>
              </div>
            </form>
            <ul className="space-y-2">
              {Array.isArray(currencies) ? currencies.map((currency) => (
                <li key={currency.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <span>{currency.name} ({currency.code}) {currency.symbol}</span>
                  <span>{currency.isDefault ? t('default') : ''}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCurrency(currency.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              )) : null}
            </ul>
          </TabsContent>

          <TabsContent value="statuses">
            <div className="max-w-2xl mx-auto">
              {editingStatus ? (
                <form onSubmit={handleEditStatus} className="space-y-6 mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="editStatusName">{t('statusName')}</Label>
                      <Input
                        id="editStatusName"
                        placeholder={t('statusName')}
                        value={editStatusValues.name}
                        onChange={(e) => setEditStatusValues({ ...editStatusValues, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="editStatusPriority">{t('statusPriority')}</Label>
                      <Input
                        id="editStatusPriority"
                        type="number"
                        placeholder={t('priorityPlaceholder')}
                        value={editStatusValues.priority}
                        onChange={(e) => setEditStatusValues({ 
                          ...editStatusValues, 
                          priority: Math.max(1, Math.min(99, parseInt(e.target.value) || 1)) 
                        })}
                        min="1"
                        max="99"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editStatusColor">{t('statusColor')}</Label>
                    <div className="flex items-center space-x-4">
                      <Input
                        id="editStatusColor"
                        type="color"
                        value={editStatusValues.color}
                        onChange={(e) => setEditStatusValues({ ...editStatusValues, color: e.target.value })}
                        className="w-20 h-10"
                      />
                      <div 
                        className="w-10 h-10 rounded-full border"
                        style={{ backgroundColor: editStatusValues.color }}
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit" className="w-full sm:w-auto">
                      <Edit2 className="w-4 h-4 mr-2" />
                      {t('saveChanges')}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost"
                      onClick={() => {
                        setEditingStatus(null);
                        setEditStatusValues({ name: '', color: '#000000', priority: 1 });
                      }}
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAddStatus} className="space-y-6 mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="statusName">{t('statusName')}</Label>
                      <Input
                        id="statusName"
                        placeholder={t('statusName')}
                        value={newStatus.name}
                        onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="statusPriority">{t('statusPriority')}</Label>
                      <Input
                        id="statusPriority"
                        type="number"
                        placeholder={t('priorityPlaceholder')}
                        value={newStatus.priority}
                        onChange={(e) => setNewStatus({ 
                          ...newStatus, 
                          priority: Math.max(1, Math.min(99, parseInt(e.target.value) || 1)) 
                        })}
                        min="1"
                        max="99"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="statusColor">{t('statusColor')}</Label>
                    <div className="flex items-center space-x-4">
                      <Input
                        id="statusColor"
                        type="color"
                        value={newStatus.color}
                        onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                        className="w-20 h-10"
                      />
                      <div 
                        className="w-10 h-10 rounded-full border"
                        style={{ backgroundColor: newStatus.color }}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full sm:w-auto">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {t('addStatus')}
                  </Button>
                </form>
              )}

              <ul className="grid gap-4 sm:grid-cols-2">
                {statuses
                  .sort((a, b) => a.priority - b.priority)
                  .map((status) => (
                    <li key={status.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="font-medium dark:text-gray-100">{status.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-gray-100"
                            onClick={() => {
                              setEditingStatus(status);
                              setEditStatusValues({
                                name: status.name,
                                color: status.color,
                                priority: status.priority
                              });
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-gray-100"
                            onClick={() => handleDeleteStatus(status.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t('priority')}: {status.priority}
                      </div>
                    </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="paymentMethods">
            {editingPaymentMethod ? (
              <form onSubmit={handleUpdatePaymentMethod} className="space-y-4 mb-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder={t('paymentMethodName')}
                    value={editPaymentMethodValue}
                    onChange={(e) => setEditPaymentMethodValue(e.target.value)}
                    className="flex-grow"
                  />
                  <Button type="submit">
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('saveChanges')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setEditingPaymentMethod(null);
                      setEditPaymentMethodValue('');
                    }}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddPaymentMethod} className="space-y-4 mb-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder={t('paymentMethodName')}
                    value={newPaymentMethod.name}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, name: e.target.value })}
                    className="flex-grow"
                  />
                  <Button type="submit">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {t('addPaymentMethod')}
                  </Button>
                </div>
              </form>
            )}
            <ul className="space-y-2">
              {paymentMethods.map((method) => (
                <li key={method.id} className="flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded dark:text-gray-100 transition-colors">
                  <span>{method.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPaymentMethod(method)}
                      className="hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      className="hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="deliveryMethods">
            {editingDeliveryMethod ? (
              <form onSubmit={handleUpdateDeliveryMethod} className="space-y-4 mb-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder={t('deliveryMethodName')}
                    value={editDeliveryMethodValue}
                    onChange={(e) => setEditDeliveryMethodValue(e.target.value)}
                    className="flex-grow"
                  />
                  <Button type="submit">
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('saveChanges')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setEditingDeliveryMethod(null);
                      setEditDeliveryMethodValue('');
                    }}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddDeliveryMethod} className="space-y-4 mb-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder={t('deliveryMethodName')}
                    value={newDeliveryMethod.name}
                    onChange={(e) => setNewDeliveryMethod({ ...newDeliveryMethod, name: e.target.value })}
                    className="flex-grow"
                  />
                  <Button type="submit">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {t('addDeliveryMethod')}
                  </Button>
                </div>
              </form>
            )}
            <ul className="space-y-2">
              {Array.isArray(deliveryMethods) ? deliveryMethods.map((method) => (
                <li key={method.id} className="flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded dark:text-gray-100 transition-colors">
                  <span>{method.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDeliveryMethod(method)}
                      className="hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDeliveryMethod(method.id)}
                      className="hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              )) : null}
            </ul>
          </TabsContent>

          <TabsContent value="sources">
            <form onSubmit={handleAddSource} className="space-y-4 mb-4">
              <div className="flex space-x-2">
                <Input
                  placeholder={t('sourceName')}
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="flex-grow"
                />
                <Input
                  placeholder={t('sourceUrl')}
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  className="flex-grow"
                />
                <Button type="submit">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {t('addSource')}
                </Button>
              </div>
            </form>
            <ul className="space-y-2">
              {Array.isArray(sources) ? sources.map((source) => (
                <li key={source.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <div>
                    <span className="font-medium dark:text-gray-100">{source.name}</span>
                    {source.url && (
                      <span className="ml-2 text-gray-500 dark:text-gray-400">{source.url}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSource(source.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              )) : null}
            </ul>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 