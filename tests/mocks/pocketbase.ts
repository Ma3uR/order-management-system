/**
 * Mock implementations for PocketBase authentication and database calls
 */

export const mockOrderData = {
  id: 'test-order-1',
  orderNumber: 'ORD-001',
  status: 'completed',
  source: 'rozetka',
  currency: 'UAH',
  totalPrice: 1000,
  expand: {
    status: { id: 'status-1', marketplace_code: 'DELIVERED' },
    source: { id: 'source-1', name: 'Rozetka' },
    currency: { id: 'currency-1', code: 'UAH' },
    paymentMethod: { id: 'payment-1', name: 'Card' },
    deliveryMethod: { id: 'delivery-1', name: 'Courier' }
  }
};

export const mockReceiptData = {
  id: 'receipt-1',
  order_id: 'test-order-1',
  receipt_type: 'sale',
  status: 'success',
  created: new Date().toISOString()
};

class MockPocketBase {
  private collections: Record<string, any[]> = {
    orders: [mockOrderData],
    fiscal_receipts: []
  };

  collection(name: string) {
    return {
      getOne: jest.fn().mockImplementation((id: string, options?: any) => {
        const item = this.collections[name]?.find(item => item.id === id);
        if (!item) {
          throw new Error(`Record not found: ${id}`);
        }
        return Promise.resolve(item);
      }),
      
      getList: jest.fn().mockImplementation((page: number, perPage: number, options?: any) => {
        const items = this.collections[name] || [];
        const filteredItems = options?.filter ? items.filter(() => true) : items; // Simple mock
        
        return Promise.resolve({
          items: filteredItems.slice((page - 1) * perPage, page * perPage),
          totalItems: filteredItems.length,
          page,
          perPage
        });
      }),

      create: jest.fn().mockImplementation((data: any) => {
        const newItem = { id: `new-${Date.now()}`, ...data, created: new Date().toISOString() };
        this.collections[name] = this.collections[name] || [];
        this.collections[name].push(newItem);
        return Promise.resolve(newItem);
      }),

      update: jest.fn().mockImplementation((id: string, data: any) => {
        const items = this.collections[name] || [];
        const index = items.findIndex(item => item.id === id);
        if (index === -1) {
          throw new Error(`Record not found: ${id}`);
        }
        items[index] = { ...items[index], ...data };
        return Promise.resolve(items[index]);
      }),

      delete: jest.fn().mockImplementation((id: string) => {
        const items = this.collections[name] || [];
        const index = items.findIndex(item => item.id === id);
        if (index === -1) {
          throw new Error(`Record not found: ${id}`);
        }
        const deleted = items.splice(index, 1)[0];
        return Promise.resolve(deleted);
      })
    };
  }

  // Test utility methods
  _addToCollection(collectionName: string, item: any) {
    this.collections[collectionName] = this.collections[collectionName] || [];
    this.collections[collectionName].push(item);
  }

  _clearCollection(collectionName: string) {
    this.collections[collectionName] = [];
  }

  _getCollection(collectionName: string) {
    return this.collections[collectionName] || [];
  }
}

export const mockPb = new MockPocketBase();

export const authenticatedCall = jest.fn().mockImplementation((fn: Function) => {
  return fn(mockPb);
});

export default mockPb;
