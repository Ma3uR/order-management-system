import { useState, useEffect } from 'react';
import { OrdersResponse } from '@/app/types/pocketbase-types';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/shared/ui/dialog";
import { Label } from "@/app/components/shared/ui/label";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select";
import { Textarea } from "@/app/components/shared/ui/textarea";
import { OrderProducts } from './OrderProducts';
import { useEntities } from '@/app/hooks/useEntities';
import { StatusSelect } from "@/app/components/shared/ui/StatusSelect";
import { UtilityService } from '@/app/services/utilityService';

type Status = {
  id: string;
  name: string;
  color: string;
};

interface ProductInput {
  title: string;
  quantity: number;
  price: number;
}

interface OrderDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrdersResponse | null;
  onUpdate: (orderId: string, orderData: Partial<OrdersResponse>) => Promise<void>;
  onStatusChange: (orderId: string, statusId: string) => Promise<void>;
  translations: {
    orderDetails: string;
    editOrder: string;
    orderNumber: string;
    source: string;
    selectSource: string;
    deliveryMethod: string;
    selectDeliveryMethod: string;
    deliveryPostNumber: string;
    phoneNumber: string;
    fullName: string;
    paymentMethod: string;
    selectPaymentMethod: string;
    notes: string;
    notesPlaceholder: string;
    blacklistedCustomerWarning: string;
    products: string;
    addProduct: string;
    product: string;
    quantity: string;
    price: string;
    totalItems: string;
    totalAmount: string;
    status: string;
    createdAt: string;
    updateOrder: string;
  };
  translateStatus: (status: string) => string;
}

export function OrderDetails({
  isOpen,
  onClose,
  order,
  onUpdate,
  onStatusChange,
  translations,
  translateStatus
}: OrderDetailsProps) {
  const { deliveryMethods, paymentMethods, sources, statuses, isLoading } = useEntities();

  const [orderData, setOrderData] = useState<Partial<OrdersResponse> | null>(null);
  const [productInputs, setProductInputs] = useState<ProductInput[]>([]);
  const [isBlacklisted] = useState<boolean>(false);

  useEffect(() => {
    if (order) {
      setOrderData(order);
      setProductInputs(
        (order.products as Array<{ name: string; quantity: number; price: number }>).map((p) => ({
          title: p.name,
          quantity: p.quantity,
          price: p.price
        }))
      );
    }
  }, [order]);

  const handleInputChange = (name: string, value: string) => {
    setOrderData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSelectChange = (name: string, value: string) => {
    if (!orderData) return;

    if (name === 'deliveryMethod') {
      const selectedMethod = deliveryMethods.find(method => method.id === value);
      if (selectedMethod) {
        setOrderData({
          ...orderData,
          deliveryMethod: selectedMethod.id
        });
      }
    } else if (name === 'paymentMethod') {
      const selectedMethod = paymentMethods.find(method => method.id === value);
      if (selectedMethod) {
        setOrderData({
          ...orderData,
          paymentMethod: selectedMethod.id
        });
      }
    } else if (name === 'source') {
      setOrderData({
        ...orderData,
        source: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData || !order) return;

    try {
      // Calculate totals from product inputs
      const totalItems = productInputs.reduce((sum, p) => sum + p.quantity, 0);
      const totalAmount = productInputs.reduce((sum, p) => sum + (p.quantity * p.price), 0);

      const updateData = {
        ...orderData,
        products: productInputs.map(p => ({
          name: p.title,
          quantity: p.quantity,
          price: p.price
        })),
        numberOfItems: totalItems,
        amount: totalAmount
      };

      await onUpdate(order.orderNumber, updateData);
      onClose();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  if (isLoading || !orderData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
            {translations.orderDetails}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {translations.editOrder}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{translations.orderNumber}</Label>
                <Input
                  name="orderNumber"
                  value={orderData.orderNumber}
                  onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label>{translations.source}</Label>
                <Select
                  value={orderData.source}
                  onValueChange={(value) => handleSelectChange('source', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={translations.selectSource} />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map(source => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{translations.status}</Label>
                <StatusSelect
                  status={orderData.status ? { 
                    id: orderData.status,
                    name: statuses.find(s => s.id === orderData.status)?.name || '',
                    color: statuses.find(s => s.id === orderData.status)?.color || '#000000'
                  } : undefined}
                  statuses={statuses as Status[]}
                  onStatusChange={(statusId) => {
                    if (!order) return Promise.resolve();
                    return onStatusChange(order.orderNumber, statusId);
                  }}
                  translateStatus={translateStatus}
                  getContrastColor={UtilityService.getContrastColor}
                />
              </div>
              <div className="space-y-2">
                <Label>{translations.createdAt}</Label>
                <Input
                  value={new Date(orderData?.created || new Date()).toLocaleString()}
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{translations.deliveryMethod}</Label>
              <Select
                value={orderData.deliveryMethod}
                onValueChange={(value) => handleSelectChange('deliveryMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={translations.selectDeliveryMethod} />
                </SelectTrigger>
                <SelectContent>
                  {deliveryMethods.map(method => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{translations.deliveryPostNumber}</Label>
                <Input
                  name="deliveryPostNumber"
                  value={orderData.deliveryPostNumber || ''}
                  onChange={(e) => handleInputChange('deliveryPostNumber', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{translations.phoneNumber}</Label>
                <Input
                  name="phoneNumber"
                  value={orderData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{translations.fullName}</Label>
              <Input
                name="fullName"
                value={orderData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
              />
            </div>

            <OrderProducts
              products={productInputs}
              onChange={setProductInputs}
              translations={translations}
            />

            {isBlacklisted && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/50 p-4 border-l-4 border-yellow-400 dark:border-yellow-600">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {translations.blacklistedCustomerWarning}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{translations.paymentMethod}</Label>
              <Select
                value={orderData.paymentMethod}
                onValueChange={(value) => handleSelectChange('paymentMethod', value)}
                disabled={isBlacklisted}
              >
                <SelectTrigger>
                  <SelectValue placeholder={translations.selectPaymentMethod} />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods
                    .filter(method => !isBlacklisted || method.name.toLowerCase().includes('prepayment'))
                    .map(method => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{translations.notes}</Label>
              <Textarea
                name="notes"
                value={orderData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder={translations.notesPlaceholder}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full">
              {translations.updateOrder}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 