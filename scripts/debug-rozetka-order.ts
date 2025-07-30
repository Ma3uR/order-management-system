import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

class RozetkaDebugAPI {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  async authenticate() {
    try {
      const base64Password = Buffer.from(process.env.ROZETKA_PASSWORD || '').toString('base64');

      const response = await axios.post(`${ROZETKA_API_BASE}/sites`, {
        username: process.env.ROZETKA_USERNAME,
        password: base64Password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data?.content?.access_token) {
        throw new Error('No access token in response');
      }

      this.token = response.data.content.access_token;
      this.tokenExpiry = new Date(Date.now() + (3600 * 1000 - 60000)); // 59 minutes
      console.log('✅ Authenticated successfully');
      return this.token;
    } catch (error) {
      console.error('❌ Rozetka authentication failed:', error);
      throw error;
    }
  }

  async ensureValidToken() {
    if (!this.token || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.token;
  }

  async getOrderById(orderId: string) {
    try {
      const token = await this.ensureValidToken();
      
      console.log(`🔍 Fetching order ${orderId} from Rozetka API...`);
      
      const response = await axios.get(`${ROZETKA_API_BASE}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Validate-Exception': '1',
          'Content-Language': 'uk'
        },
        params: {
          expand: 'delivery,user,status_data,payment_method_id,status_available,is_payed,prro_receipt_status,purchases'
        }
      });

      console.log('📊 Raw API Response Status:', response.status);
      console.log('📊 Raw API Response Headers:', response.headers);
      
      if (!response.data.success) {
        console.error('❌ API returned error:', response.data);
        throw new Error(response.data.errors?.description || 'Failed to fetch order');
      }

      return response.data.content;
    } catch (error) {
      console.error('❌ Failed to fetch order:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
      
      throw error;
    }
  }

  async searchOrderById(orderId: string) {
    try {
      const token = await this.ensureValidToken();
      
      console.log(`🔍 Searching for order ${orderId} in orders/search endpoint...`);
      
      // Try searching across different pages and date ranges
      const today = new Date();
      const sixMonthsAgo = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
      
      const from = sixMonthsAgo.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];
      
      let foundOrder = null;
      let page = 1;
      const maxPages = 10;
      
      while (page <= maxPages && !foundOrder) {
        console.log(`📄 Searching page ${page}...`);
        
        const response = await axios.get(`${ROZETKA_API_BASE}/orders/search`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Validate-Exception': '1',
            'Content-Language': 'uk'
          },
          params: {
            page: page,
            sort: '-id',
            types: 1, // All orders
            created_from: from,
            created_to: to,
            expand: 'delivery,user,status_data,payment_method_id,status_available,is_payed,prro_receipt_status,purchases'
          }
        });

        if (!response.data.success) {
          console.error('❌ Search API returned error:', response.data);
          break;
        }

        const orders = response.data.content.orders || [];
        console.log(`📊 Page ${page}: Found ${orders.length} orders`);
        
        if (orders.length > 0) {
          console.log(`🔍 Order IDs on page ${page}:`, orders.slice(0, 5).map((o: any) => o.id));
        }
        
        foundOrder = orders.find((order: any) => order.id.toString() === orderId);
        
        if (foundOrder) {
          console.log(`✅ Found order ${orderId} on page ${page}`);
          break;
        }
        
        if (orders.length === 0) {
          console.log(`🔚 No more orders on page ${page}, stopping search`);
          break;
        }
        
        page++;
      }
      
      return foundOrder;
    } catch (error) {
      console.error('❌ Failed to search for order:', error);
      throw error;
    }
  }
}

async function debugOrder(orderId: string) {
  const api = new RozetkaDebugAPI();
  
  console.log(`🚀 Starting debug for Rozetka order: ${orderId}`);
  console.log('═'.repeat(60));
  
  try {
    // Method 1: Try direct order fetch
    console.log('\n📍 METHOD 1: Direct order fetch by ID');
    console.log('-'.repeat(40));
    
    try {
      const directOrder = await api.getOrderById(orderId);
      console.log('✅ Direct fetch successful!');
      console.log('📊 Direct Order Data:');
      console.log(JSON.stringify(directOrder, null, 2));
    } catch (directError) {
      console.log('❌ Direct fetch failed:', directError instanceof Error ? directError.message : directError);
    }
    
    // Method 2: Search through orders list
    console.log('\n📍 METHOD 2: Search through orders list');
    console.log('-'.repeat(40));
    
    try {
      const searchOrder = await api.searchOrderById(orderId);
      
      if (searchOrder) {
        console.log('✅ Order found in search!');
        console.log('📊 Search Order Data:');
        console.log(JSON.stringify(searchOrder, null, 2));
        
        // Focus on status information
        console.log('\n🎯 STATUS ANALYSIS:');
        console.log('-'.repeat(20));
        console.log('Status:', searchOrder.status);
        console.log('Status type:', typeof searchOrder.status);
        console.log('Status data:', searchOrder.status_data);
        console.log('Available statuses:', searchOrder.status_available);
        
        if (searchOrder.status_available && Array.isArray(searchOrder.status_available)) {
          console.log('Available status transitions:');
          searchOrder.status_available.forEach((transition: any, index: number) => {
            console.log(`  ${index + 1}. Status: ${transition.status}, ID: ${transition.id}`);
          });
        }
        
      } else {
        console.log('❌ Order not found in search results');
        console.log('This could mean:');
        console.log('  - Order is older than 6 months');
        console.log('  - Order has a status that excludes it from types=1');
        console.log('  - Order might be in a different status category');
      }
    } catch (searchError) {
      console.log('❌ Search failed:', searchError instanceof Error ? searchError.message : searchError);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
  
  console.log('\n═'.repeat(60));
  console.log('🏁 Debug completed');
}

// Get order ID from command line arguments or use default
const orderId = process.argv[2] || '858865676';

debugOrder(orderId).then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});