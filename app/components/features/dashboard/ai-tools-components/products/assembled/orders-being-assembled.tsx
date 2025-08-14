'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/shared/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/shared/ui/tabs';
import { Input } from '@/app/components/shared/ui/input';
import { Button } from '@/app/components/shared/ui/button';
import { Badge } from '@/app/components/shared/ui/badge';
import { ScrollArea } from '@/app/components/shared/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/shared/ui/collapsible';
import {
  Search,
  Download,
  Package,
  User,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  List,
  Grid3X3,
  Leaf,
  Gem,
  ExternalLink,
} from 'lucide-react';

interface Product {
  name: string;
  quantity: number;
  price?: number;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: string;
  phoneNumber: string;
  source?: string;
  status?: string;
  products: Product[];
}

interface AggregatedProduct {
  name: string;
  quantity: number;
}

interface OrdersBeingAssembledData {
  ordersCount: number;
  orders: Order[];
  productsCount: number;
  products: AggregatedProduct[];
}

interface OrdersBeingAssembledProps {
  data: OrdersBeingAssembledData;
}

// Helper function to get source color
const getSourceColor = (sourceName: string) => {
  const sourceColors: Record<string, string> = {
    'rozetka': '#10B981', // Green
    'prom.ua': '#8B5CF6', // Purple  
    'prom': '#8B5CF6', // Purple
    'epicentr': '#6B7280', // Gray
  };
  
  // Check source name in lowercase for matching
  const lowerName = sourceName.toLowerCase();
  for (const [key, color] of Object.entries(sourceColors)) {
    if (lowerName.includes(key)) {
      return color;
    }
  }
  
  return '#6B7280'; // Default gray
};

// Helper function to get status color
const getStatusColor = (statusName: string) => {
  const lowerStatus = statusName.toLowerCase();
  
  if (lowerStatus.includes('комплект')) return '#F59E0B'; // Amber for being assembled
  if (lowerStatus.includes('assembl')) return '#F59E0B'; // Amber for being assembled
  if (lowerStatus.includes('готов')) return '#10B981'; // Green for ready
  if (lowerStatus.includes('ready')) return '#10B981'; // Green for ready
  if (lowerStatus.includes('відправ')) return '#3B82F6'; // Blue for shipped
  if (lowerStatus.includes('ship')) return '#3B82F6'; // Blue for shipped
  if (lowerStatus.includes('достав')) return '#059669'; // Dark green for delivered
  if (lowerStatus.includes('deliver')) return '#059669'; // Dark green for delivered
  if (lowerStatus.includes('скасов')) return '#EF4444'; // Red for cancelled
  if (lowerStatus.includes('cancel')) return '#EF4444'; // Red for cancelled
  
  return '#6B7280'; // Default gray
};

// Product categorization function
function categorizeProducts(products: AggregatedProduct[]) {
  const regularProducts: AggregatedProduct[] = [];
  const mineralSoils: AggregatedProduct[] = [];
  const organicSoils: AggregatedProduct[] = [];
  
  products.forEach(product => {
    const nameLower = product.name.toLowerCase();
    
    // Check if product name contains "грунт" anywhere (not just at the start)
    // or if it's explicitly a soil product
    const isSoilProduct = nameLower.includes('грунт');
    
    if (isSoilProduct) {
      // Check for mineral soil keywords
      if (nameLower.includes('мінеральн') || nameLower.includes('минеральн')) {
        mineralSoils.push(product);
      } 
      // Check for organic soil keywords
      else if (nameLower.includes('органічн') || nameLower.includes('органическ')) {
        organicSoils.push(product);
      } 
      // If it has "грунт" but no specific type, check context
      else {
        // Default soils without type specification go to regular
        regularProducts.push(product);
      }
    } else {
      // Not a soil product
      regularProducts.push(product);
    }
  });
  
  // Sort each list alphabetically using Ukrainian locale
  return {
    regular: regularProducts.sort((a, b) => a.name.localeCompare(b.name, 'uk')),
    mineral: mineralSoils.sort((a, b) => a.name.localeCompare(b.name, 'uk')),
    organic: organicSoils.sort((a, b) => a.name.localeCompare(b.name, 'uk'))
  };
}

export default function OrdersBeingAssembled({ data }: OrdersBeingAssembledProps) {
  const t = useTranslations('Dashboard.ai-tools.products.assembled');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Toggle order expansion
  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(orderId)) {
        newExpanded.delete(orderId);
      } else {
        newExpanded.add(orderId);
      }
      return newExpanded;
    });
  };

  // Navigate to order details
  const handleViewOrder = (orderId: string) => {
    // Open orders page with specific order modal
    const ordersUrl = `/${window.location.pathname.split('/')[1]}/orders?openModal=${orderId}`;
    window.open(ordersUrl, '_blank');
  };

  // Filter orders based on search
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return data.orders;
    
    const searchLower = searchTerm.toLowerCase();
    return data.orders.filter(order =>
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.customer.toLowerCase().includes(searchLower) ||
      order.phoneNumber.includes(searchLower) ||
      order.products.some(product => 
        product.name.toLowerCase().includes(searchLower)
      )
    );
  }, [data.orders, searchTerm]);

  // Categorize and filter products based on search
  const categorizedProducts = useMemo(() => {
    if (!data.products) return { regular: [], mineral: [], organic: [] };
    
    const categorized = categorizeProducts(data.products);
    
    if (!searchTerm) return categorized;
    
    const searchLower = searchTerm.toLowerCase();
    return {
      regular: categorized.regular.filter(p => p.name.toLowerCase().includes(searchLower)),
      mineral: categorized.mineral.filter(p => p.name.toLowerCase().includes(searchLower)),
      organic: categorized.organic.filter(p => p.name.toLowerCase().includes(searchLower))
    };
  }, [data.products, searchTerm]);
  
  // Get total filtered products count
  const totalFilteredProducts = categorizedProducts.regular.length + 
    categorizedProducts.mineral.length + 
    categorizedProducts.organic.length;

  // Export orders to CSV
  const exportOrdersToCSV = () => {
    const csvData = [
      ['Order Number', 'Customer', 'Phone', 'Created At', 'Products', 'Total Quantity'].join(','),
      ...filteredOrders.map(order => [
        order.orderNumber,
        `"${order.customer}"`,
        order.phoneNumber,
        new Date(order.createdAt).toLocaleDateString(),
        `"${order.products.map(p => `${p.name} (${p.quantity})`).join('; ')}"`,
        order.products.reduce((sum, p) => sum + p.quantity, 0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-being-assembled-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Export products to CSV
  const exportProductsToCSV = () => {
    const allProducts = [
      ...categorizedProducts.regular.map(p => ({ ...p, category: 'Regular' })),
      ...categorizedProducts.mineral.map(p => ({ ...p, category: 'Грунт мінеральний' })),
      ...categorizedProducts.organic.map(p => ({ ...p, category: 'Грунт органічний' }))
    ];
    
    const csvData = [
      ['Category', 'Product Name', 'Total Quantity'].join(','),
      ...allProducts.map(product => [
        `"${product.category}"`,
        `"${product.name}"`,
        product.quantity
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-being-assembled-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalOrderQuantity = (products: Product[]) => {
    return products.reduce((sum, product) => sum + product.quantity, 0);
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              {t('title')}
            </CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {data.ordersCount} {t('orders')}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {data.productsCount} {t('products')}
            </Badge>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              {t('ordersTab')} ({filteredOrders.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              {t('productsTab')} ({totalFilteredProducts})
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {t('showingOrders', { count: filteredOrders.length })}
              </p>
              <Button
                onClick={exportOrdersToCSV}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('exportOrders')}
              </Button>
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredOrders.length === 0 ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">
                          {t('noOrdersFound')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className="transition-all hover:shadow-md">
                      <Collapsible
                        open={expandedOrders.has(order.id)}
                        onOpenChange={() => toggleOrderExpansion(order.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                  <CardTitle className="text-lg">
                                    {order.orderNumber}
                                  </CardTitle>
                                  <Badge variant="outline" className="text-xs">
                                    {getTotalOrderQuantity(order.products)} {t('items')}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {order.customer}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(order.createdAt)}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge
                                    variant="default"
                                    className="text-white text-xs"
                                    style={{
                                      backgroundColor: getSourceColor(order.source || 'Unknown'),
                                      borderColor: getSourceColor(order.source || 'Unknown')
                                    }}
                                  >
                                    {order.source || t('source')}
                                  </Badge>
                                  
                                  {order.status && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                      style={{
                                        backgroundColor: getStatusColor(order.status) + '20',
                                        borderColor: getStatusColor(order.status),
                                        color: getStatusColor(order.status)
                                      }}
                                    >
                                      {order.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewOrder(order.id);
                                  }}
                                  className="h-8 w-8 p-0"
                                  title={t('viewOrder')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                {expandedOrders.has(order.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="border-t pt-4">
                              <h4 className="font-semibold mb-3 text-sm">
                                {t('products')} ({order.products.length})
                              </h4>
                              <div className="grid gap-2">
                                {order.products.map((product, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{product.name}</p>
                                      {product.price && (
                                        <p className="text-xs text-muted-foreground">
                                          {product.price.toLocaleString()} UAH
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {product.quantity}x
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {t('showingProducts', { count: totalFilteredProducts })}
              </p>
              <Button
                onClick={exportProductsToCSV}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('exportProducts')}
              </Button>
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {/* Regular Products Section */}
                {categorizedProducts.regular.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold text-base">
                        {t('regularProducts')}
                      </h3>
                      <Badge variant="secondary" className="ml-2">
                        {categorizedProducts.regular.length}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {categorizedProducts.regular.map((product, index) => (
                        <Card key={`regular-${index}`} className="transition-all hover:shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm leading-tight mb-1">
                                  {product.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {t('totalQuantity')}
                                </p>
                              </div>
                              <Badge variant="default" className="shrink-0 text-sm font-semibold">
                                {product.quantity}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mineral Soils Section */}
                {categorizedProducts.mineral.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Gem className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-base">
                        {t('mineralSoils')}
                      </h3>
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                        {categorizedProducts.mineral.length}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {categorizedProducts.mineral.map((product, index) => (
                        <Card key={`mineral-${index}`} className="transition-all hover:shadow-md border-blue-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm leading-tight mb-1">
                                  {product.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {t('totalQuantity')}
                                </p>
                              </div>
                              <Badge variant="default" className="shrink-0 text-sm font-semibold bg-blue-500">
                                {product.quantity}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organic Soils Section */}
                {categorizedProducts.organic.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Leaf className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-base">
                        {t('organicSoils')}
                      </h3>
                      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                        {categorizedProducts.organic.length}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {categorizedProducts.organic.map((product, index) => (
                        <Card key={`organic-${index}`} className="transition-all hover:shadow-md border-green-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm leading-tight mb-1">
                                  {product.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {t('totalQuantity')}
                                </p>
                              </div>
                              <Badge variant="default" className="shrink-0 text-sm font-semibold bg-green-500">
                                {product.quantity}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* No products found */}
                {totalFilteredProducts === 0 && (
                  <Card>
                    <CardContent className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">
                          {t('noProductsFound')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}