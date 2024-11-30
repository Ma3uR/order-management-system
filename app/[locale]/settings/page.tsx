'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { PlusCircle, Trash2, Edit2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import axios from 'axios';

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

interface OrdersManagementProps {
  translations: {
    // ... existing translations ...
    selectSource: string;
    // ... rest of translations ...
  }
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

  useEffect(() => {
    fetchCurrencies();
    fetchStatuses();
    fetchPaymentMethods();
    fetchDeliveryMethods();
    fetchSources();
  }, []);

  const showFlashMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  };

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

  const fetchDeliveryMethods = async () => {
    try {
      const response = await fetch('/api/delivery-methods');
      const data = await response.json();
      if (Array.isArray(data)) {
        setDeliveryMethods(data);
      }
    } catch (error) {
      console.error('Error fetching delivery methods:', error);
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
        throw new Error(errorData.error || 'Failed to add status');
      }
      const addedStatus = await response.json();
      setStatuses([...statuses, addedStatus]);
      setNewStatus({ name: '', color: '#000000', priority: 1 });
      showFlashMessage('Status added successfully!', 'success');
    } catch (error) {
      console.error('Error adding status:', error);
      showFlashMessage(error instanceof Error ? error.message : 'An error occurred', 'error');
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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add payment method');
      }
      const addedPaymentMethod = await response.json();
      setPaymentMethods([...paymentMethods, addedPaymentMethod]);
      setNewPaymentMethod({ name: '' });
      showFlashMessage('Payment method added successfully!', 'success');
    } catch (error) {
      console.error('Error adding payment method:', error);
      showFlashMessage(error instanceof Error ? error.message : 'An error occurred', 'error');
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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add delivery method');
      }
      const addedDeliveryMethod = await response.json();
      setDeliveryMethods([...deliveryMethods, addedDeliveryMethod]);
      setNewDeliveryMethod({ name: '' });
      showFlashMessage('Delivery method added successfully!', 'success');
    } catch (error) {
      console.error('Error adding delivery method:', error);
      showFlashMessage(error instanceof Error ? error.message : 'An error occurred', 'error');
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
      const record = await response.json();
      setSources([...sources, record]);
      setNewSource({ name: '', url: '' });
      showFlashMessage('Source added successfully!', 'success');
    } catch (error) {
      console.error('Error adding source:', error);
      showFlashMessage(error instanceof Error ? error.message : 'An error occurred', 'error');
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
      showFlashMessage('Status deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting status:', error);
      showFlashMessage('Error deleting status', 'error');
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

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Failed to delete payment method');
      setPaymentMethods(paymentMethods.filter(method => method.id !== id));
      showFlashMessage('Payment method deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting payment method:', error);
      showFlashMessage('Error deleting payment method', 'error');
    }
  };

  const handleDeleteDeliveryMethod = async (id: string) => {
    try {
      const response = await fetch(`/api/delivery-methods/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete delivery method');
      setDeliveryMethods(deliveryMethods.filter(method => method.id !== id));
      showFlashMessage('Delivery method deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting delivery method:', error);
      showFlashMessage('Error deleting delivery method', 'error');
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete source');
      setSources(sources.filter(source => source.id !== id));
      showFlashMessage('Source deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting source:', error);
      showFlashMessage('Error deleting source', 'error');
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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit status');
      }
      const updatedStatus = await response.json();
      setStatuses(statuses.map(status => status.id === updatedStatus.id ? updatedStatus : status));
      setEditingStatus(null);
      showFlashMessage('Status updated successfully!', 'success');
    } catch (error) {
      console.error('Error editing status:', error);
      if (error instanceof Error) {
        showFlashMessage(error.message, 'error');
      } else {
        showFlashMessage('An unexpected error occurred', 'error');
      }
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <Link href="/dashboard" className="mb-6 inline-block text-blue-500 hover:underline">
        {t('backToDashboard')}
      </Link>
      {flashMessage && (
        <div className={`mb-4 p-2 rounded ${flashMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {flashMessage.message}
        </div>
      )}
      <div className="space-y-4">
        <Tabs defaultValue="profile">
          <TabsList className="overflow-x-auto">
            <div className="grid min-w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
              <TabsTrigger value="profile">{t('profile')}</TabsTrigger>
              <TabsTrigger value="currencies">{t('currencies')}</TabsTrigger>
              <TabsTrigger value="statuses">{t('statuses')}</TabsTrigger>
              <TabsTrigger value="paymentMethods">{t('paymentMethods')}</TabsTrigger>
              <TabsTrigger value="deliveryMethods">{t('deliveryMethods')}</TabsTrigger>
              <TabsTrigger value="sources">{t('sources')}</TabsTrigger>
            </div>
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
                <li key={currency.id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
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
              <form onSubmit={handleAddStatus} className="space-y-6 mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-lg font-medium">{t('addNewStatus')}</h3>
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

              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('existingStatuses')}</h3>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {statuses
                    .sort((a, b) => a.priority - b.priority)
                    .map((status) => (
                      <li key={status.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: status.color }}
                            />
                            <span className="font-medium">{status.name}</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
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
                              onClick={() => handleDeleteStatus(status.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          {t('priority')}: {status.priority}
                        </div>
                      </li>
                  ))}
                </ul>
              </div>

              {editingStatus && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-medium mb-4">{t('editStatus')}</h3>
                    <form onSubmit={handleEditStatus} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="editStatusName">{t('statusName')}</Label>
                        <Input
                          id="editStatusName"
                          value={editStatusValues.name}
                          onChange={(e) => setEditStatusValues({ ...editStatusValues, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editStatusColor">{t('statusColor')}</Label>
                        <div className="flex items-center space-x-4">
                          <Input
                            id="editStatusColor"
                            type="color"
                            value={editStatusValues.color}
                            onChange={(e) => setEditStatusValues({ ...editStatusValues, color: e.target.value })}
                            className="w-20"
                          />
                          <div 
                            className="w-10 h-10 rounded-full border"
                            style={{ backgroundColor: editStatusValues.color }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editStatusPriority">{t('statusPriority')}</Label>
                        <Input
                          id="editStatusPriority"
                          type="number"
                          value={editStatusValues.priority}
                          onChange={(e) => setEditStatusValues({ 
                            ...editStatusValues, 
                            priority: Math.max(1, parseInt(e.target.value) || 1)
                          })}
                          min="1"
                        />
                      </div>

                      <div className="flex space-x-2 pt-4">
                        <Button type="submit" className="flex-1">{t('saveChanges')}</Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setEditingStatus(null)}
                          className="flex-1"
                        >
                          {t('cancel')}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="paymentMethods">
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
            <ul className="space-y-2">
              {paymentMethods.map((method) => (
                <li key={method.id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <span>{method.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePaymentMethod(method.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </TabsContent>
          <TabsContent value="deliveryMethods">
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
            <ul className="space-y-2">
              {Array.isArray(deliveryMethods) ? deliveryMethods.map((method) => (
                <li key={method.id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <span>{method.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDeliveryMethod(method.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
                <li key={source.id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <div>
                    <span className="font-medium">{source.name}</span>
                    {source.url && (
                      <span className="ml-2 text-gray-500">{source.url}</span>
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
