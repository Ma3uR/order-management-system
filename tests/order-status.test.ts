import { 
  isCompletedStatus, 
  isCompletedMarketplaceCode, 
  getCompletedMarketplaceCodes,
  createCompletedOrdersFilter,
  isOrderCompleted 
} from '../app/lib/utils/order-status';

describe('Order Status Utils', () => {
  describe('isCompletedMarketplaceCode', () => {
    test('should return true for completed marketplace codes', () => {
      expect(isCompletedMarketplaceCode('6')).toBe(true);
      expect(isCompletedMarketplaceCode('completed')).toBe(true);
      expect(isCompletedMarketplaceCode('delivered')).toBe(true);
    });

    test('should return false for non-completed marketplace codes', () => {
      expect(isCompletedMarketplaceCode('1')).toBe(false);
      expect(isCompletedMarketplaceCode('pending')).toBe(false);
      expect(isCompletedMarketplaceCode('processing')).toBe(false);
      expect(isCompletedMarketplaceCode('')).toBe(false);
      expect(isCompletedMarketplaceCode(null)).toBe(false);
      expect(isCompletedMarketplaceCode(undefined)).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(isCompletedMarketplaceCode('COMPLETED')).toBe(true);
      expect(isCompletedMarketplaceCode('Delivered')).toBe(true);
      expect(isCompletedMarketplaceCode('DELIVERED')).toBe(true);
    });
  });

  describe('isCompletedStatus', () => {
    test('should return true for status with completed marketplace codes', () => {
      expect(isCompletedStatus({ marketplace_code: '6', name: 'Completed' })).toBe(true);
      expect(isCompletedStatus({ marketplace_code: 'completed', name: 'Order Completed' })).toBe(true);
      expect(isCompletedStatus({ marketplace_code: 'delivered', name: 'Delivered' })).toBe(true);
    });

    test('should return false for status with non-completed marketplace codes', () => {
      expect(isCompletedStatus({ marketplace_code: '1', name: 'Pending' })).toBe(false);
      expect(isCompletedStatus({ marketplace_code: 'pending', name: 'Pending' })).toBe(false);
    });

    test('should fallback to name-based detection', () => {
      expect(isCompletedStatus({ marketplace_code: null, name: 'completed order' })).toBe(true);
      expect(isCompletedStatus({ marketplace_code: null, name: 'order delivered' })).toBe(true);
      expect(isCompletedStatus({ marketplace_code: null, name: 'виконано' })).toBe(true);
      expect(isCompletedStatus({ marketplace_code: null, name: 'доставлено' })).toBe(true);
    });

    test('should return false for null or undefined status', () => {
      expect(isCompletedStatus(null)).toBe(false);
      expect(isCompletedStatus(undefined)).toBe(false);
    });
  });

  describe('getCompletedMarketplaceCodes', () => {
    test('should return all completed marketplace codes', () => {
      const codes = getCompletedMarketplaceCodes();
      expect(codes).toEqual(['6', 'completed', 'delivered']);
      expect(codes).toHaveLength(3);
    });
  });

  describe('createCompletedOrdersFilter', () => {
    test('should create correct filter string for PocketBase', () => {
      const filter = createCompletedOrdersFilter();
      expect(filter).toBe('(status.marketplace_code = "6" || status.marketplace_code = "completed" || status.marketplace_code = "delivered")');
    });

    test('should include all completed codes in filter', () => {
      const filter = createCompletedOrdersFilter();
      expect(filter).toContain('6');
      expect(filter).toContain('completed');
      expect(filter).toContain('delivered');
    });
  });

  describe('isOrderCompleted', () => {
    test('should return true for order with completed status', () => {
      const order = {
        status: { marketplace_code: '6', name: 'Completed' }
      };
      expect(isOrderCompleted(order)).toBe(true);
    });

    test('should return false for order with non-completed status', () => {
      const order = {
        status: { marketplace_code: '1', name: 'Pending' }
      };
      expect(isOrderCompleted(order)).toBe(false);
    });

    test('should return false and warn for order with string status ID', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const order = {
        status: 'status-id-string'
      };
      
      expect(isOrderCompleted(order)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Order status is not expanded. Cannot determine completion status from ID alone.');
      
      consoleSpy.mockRestore();
    });
  });
});
