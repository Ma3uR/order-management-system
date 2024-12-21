import { Button } from "@/app/components/shared/ui/button";
import { Input } from "@/app/components/shared/ui/input";
import { Label } from "@/app/components/shared/ui/label";
import { PlusCircle } from 'lucide-react';

interface ProductInput {
  title: string;
  quantity: number;
  price: number;
}

interface OrderProductsProps {
  products: ProductInput[];
  onChange: (products: ProductInput[]) => void;
  error?: string;
  translations: {
    products: string;
    addProduct: string;
    product: string;
    quantity: string;
    price: string;
    totalItems: string;
    totalAmount: string;
  };
  readOnly?: boolean;
}

export function OrderProducts({
  products,
  onChange,
  error,
  translations,
  readOnly = false
}: OrderProductsProps) {
  const handleProductChange = (index: number, field: keyof ProductInput, value: string) => {
    const updated = [...products];
    if (field === 'quantity' || field === 'price') {
      updated[index][field] = Math.max(0, Number(value));
    } else {
      updated[index][field] = value;
    }
    onChange(updated);
  };

  const addProduct = () => {
    onChange([...products, { title: '', quantity: 1, price: 0 }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      onChange(products.filter((_, i) => i !== index));
    }
  };

  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalAmount = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className={error ? "text-destructive" : ""}>
          {translations.products}
        </Label>
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addProduct}
            className="h-8 bg-background hover:bg-accent hover:text-accent-foreground flex items-center"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {translations.addProduct}
          </Button>
        )}
      </div>
      
      <div className="rounded-md border border-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr,1fr,1fr,auto] gap-2 p-3 bg-muted/30 border-b border-border">
          <div className="text-sm font-medium text-foreground">{translations.product}</div>
          <div className="text-sm font-medium text-foreground">{translations.quantity}</div>
          <div className="text-sm font-medium text-foreground">{translations.price}</div>
          {!readOnly && <div></div>}
        </div>
        
        {/* Table Body */}
        <div className="divide-y divide-border bg-background/40">
          {products.map((product, index) => (
            <div key={index} className="grid grid-cols-[2fr,1fr,1fr,auto] gap-2 p-3 items-center hover:bg-muted/20">
              <Input
                placeholder={translations.product}
                value={product.title}
                onChange={(e) => handleProductChange(index, 'title', e.target.value)}
                className="bg-background border-input focus:bg-background"
                readOnly={readOnly}
              />
              <Input
                type="number"
                min="1"
                placeholder={translations.quantity}
                value={product.quantity}
                onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                className="bg-background border-input focus:bg-background"
                readOnly={readOnly}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={translations.price}
                value={product.price}
                onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                className="bg-background border-input focus:bg-background"
                readOnly={readOnly}
              />
              {!readOnly && products.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProduct(index)}
                  className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                >
                  ×
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 mt-4 bg-muted/20 p-4 rounded-md border border-border">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">{translations.totalItems}</Label>
          <Input
            type="number"
            value={totalItems}
            readOnly
            className="bg-background/60 border-input focus:bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">{translations.totalAmount}</Label>
          <Input
            type="number"
            value={totalAmount}
            readOnly
            className="bg-background/60 border-input focus:bg-background"
          />
        </div>
      </div>
    </div>
  );
} 