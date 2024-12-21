import { useState, useEffect } from 'react';
import { OrdersRecord, DeliveryOptionsResponse, PaymentOptionsResponse, SourcesResponse, CurrencyOptionsResponse } from '@/app/types/pocketbase-types';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/shared/ui/dialog";
import { Label } from "@/app/components/shared/ui/label";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select";
import { Textarea } from "@/app/components/shared/ui/textarea";
import { OrderProducts } from './OrderProducts';
import { useOrderValidation } from '@/app/hooks/useOrderValidation';

interface ProductInput {
  title: string;
  quantity: number;
  price: number;
}

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

interface OrderCreateProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: Partial<OrdersRecord>, productInputs: ProductInput[]) => Promise<void>;
  translations: {
    createNewOrder: string;
    orderDetails: string;
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
  };
  deliveryMethods: DeliveryOptionsResponse[];
  paymentMethods: PaymentOptionsResponse[];
  sources: SourcesResponse[];
  defaultCurrency: CurrencyOptionsResponse | null;
}

export function OrderCreate({
  isOpen,
  onClose,
  onSubmit,
  translations,
  deliveryMethods,
  paymentMethods,
  sources,
  defaultCurrency
}: OrderCreateProps) {
  const { validationErrors, validateOrder, clearValidationErrors } = useOrderValidation();

  const [orderData, setOrderData] = useState<Partial<OrdersRecord>>({
    orderNumber: '',
    source: '',
    deliveryMethod: '',
    deliveryPostNumber: '',
    phoneNumber: '',
    fullName: '',
    paymentMethod: '',
    currency: defaultCurrency?.id || '',
    notes: '',
  });

  const [productInputs, setProductInputs] = useState<ProductInput[]>([
    { title: '', quantity: 1, price: 0 }
  ]);

  const [isBlacklisted, setIsBlacklisted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      clearValidationErrors();
      setOrderData({
        orderNumber: '',
        source: '',
        deliveryMethod: '',
        deliveryPostNumber: '',
        phoneNumber: '',
        fullName: '',
        paymentMethod: '',
        currency: defaultCurrency?.id || '',
        notes: '',
      });
      setProductInputs([{ title: '', quantity: 1, price: 0 }]);
      setIsBlacklisted(false);
    }
  }, [isOpen, defaultCurrency]);

  const handleInputChange = (name: string, value: string) => {
    setOrderData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'deliveryMethod') {
      setOrderData(prev => ({
        ...prev,
        deliveryMethod: value
      }));
    } else if (name === 'paymentMethod') {
      setOrderData(prev => ({
        ...prev,
        paymentMethod: value
      }));
    } else if (name === 'source') {
      setOrderData(prev => ({
        ...prev,
        source: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateOrder(orderData, productInputs);
    if (!isValid) return;

    try {
      await onSubmit(orderData, productInputs);
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
            {translations.createNewOrder}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {translations.orderDetails}
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
                  className={validationErrors.orderNumber ? "border-destructive" : ""}
                />
                {validationErrors.orderNumber && (
                  <p className="text-sm text-destructive">{validationErrors.orderNumber}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{translations.source}</Label>
                <Select
                  value={orderData.source}
                  onValueChange={(value) => handleSelectChange('source', value)}
                >
                  <SelectTrigger className={validationErrors.source ? "border-destructive" : ""}>
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
                {validationErrors.source && (
                  <p className="text-sm text-destructive">{validationErrors.source}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{translations.deliveryMethod}</Label>
              <Select
                value={orderData.deliveryMethod}
                onValueChange={(value) => handleSelectChange('deliveryMethod', value)}
              >
                <SelectTrigger className={validationErrors.deliveryMethod ? "border-destructive" : ""}>
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
              {validationErrors.deliveryMethod && (
                <p className="text-sm text-destructive">{validationErrors.deliveryMethod}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{translations.deliveryPostNumber}</Label>
                <Input
                  name="deliveryPostNumber"
                  value={orderData.deliveryPostNumber || ''}
                  onChange={(e) => handleInputChange('deliveryPostNumber', e.target.value)}
                  className={validationErrors.deliveryPostNumber ? "border-destructive" : ""}
                />
                {validationErrors.deliveryPostNumber && (
                  <p className="text-sm text-destructive">{validationErrors.deliveryPostNumber}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{translations.phoneNumber}</Label>
                <Input
                  name="phoneNumber"
                  value={orderData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className={validationErrors.phoneNumber ? "border-destructive" : ""}
                />
                {validationErrors.phoneNumber && (
                  <p className="text-sm text-destructive">{validationErrors.phoneNumber}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{translations.fullName}</Label>
              <Input
                name="fullName"
                value={orderData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={validationErrors.fullName ? "border-destructive" : ""}
              />
              {validationErrors.fullName && (
                <p className="text-sm text-destructive">{validationErrors.fullName}</p>
              )}
            </div>

            <OrderProducts
              products={productInputs}
              onChange={setProductInputs}
              error={validationErrors.products}
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
                <SelectTrigger className={validationErrors.paymentMethod ? "border-destructive" : ""}>
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
              {validationErrors.paymentMethod && (
                <p className="text-sm text-destructive">{validationErrors.paymentMethod}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{translations.notes}</Label>
              <Textarea
                name="notes"
                value={orderData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder={translations.notesPlaceholder}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full">
              {translations.createNewOrder}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 