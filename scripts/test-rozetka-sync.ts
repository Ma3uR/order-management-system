import { getOrders, ensureValidToken } from '../app/actions/rozetka.js';
import pb, { authenticatedCall } from '../app/lib/pocketbase.js';
import { OrdersResponse } from '../app/types/pocketbase-types.js';

interface TestResults {
  typesParam: number | null;
  ordersCount: number;
  pagesChecked: number;
  statusDistribution: Record<string, number>;
  sampleOrders: Array<{
    id: string;
    status: string;
    created: string;
    amount: string;
  }>;
}

async function testTypesParameter(typesValue: number | null): Promise<TestResults> {
  console.log(`\n🧪 Testing types parameter: ${typesValue}`);
  
  try {
    let allOrders: any[] = [];
    let page = 1;
    let pagesChecked = 0;
    const maxPages = 10; // Safety limit
    
    // Test pagination for this types value
    while (page <= maxPages) {
      console.log(`  📄 Fetching page ${page} with types=${typesValue}...`);
      
      const orders = await getOrders({ 
        types: typesValue, 
        page: page 
      });
      
      pagesChecked++;
      
      if (!orders || orders.length === 0) {
        console.log(`  ⏹️  No orders on page ${page}, stopping pagination`);
        break;
      }
      
      console.log(`  ✅ Page ${page}: ${orders.length} orders found`);
      allOrders.push(...orders);
      page++;
    }
    
    // Analyze status distribution
    const statusDistribution: Record<string, number> = {};
    allOrders.forEach(order => {
      const status = order.status?.toString() || 'unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });
    
    // Get sample orders for analysis
    const sampleOrders = allOrders.slice(0, 5).map(order => ({
      id: order.id?.toString() || 'unknown',
      status: order.status?.toString() || 'unknown',
      created: order.created || 'unknown',
      amount: order.amount || '0'
    }));
    
    return {
      typesParam: typesValue,
      ordersCount: allOrders.length,
      pagesChecked,
      statusDistribution,
      sampleOrders
    };
    
  } catch (error) {
    console.error(`❌ Error testing types=${typesValue}:`, error);
    return {
      typesParam: typesValue,
      ordersCount: 0,
      pagesChecked: 0,
      statusDistribution: {},
      sampleOrders: []
    };
  }
}

async function analyzeDatabaseOrders() {
  console.log('\n📊 Analyzing existing database orders...');
  
  try {
    // Get all Rozetka orders from database
    const dbOrders = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 200, {
        filter: 'source = "4tvf116a5aitwmb"',
        sort: '-created',
        expand: 'status'
      });
    });
    
    console.log(`📋 Database contains ${dbOrders.items.length} Rozetka orders`);
    
    // Analyze status distribution in database
    const dbStatusDistribution: Record<string, number> = {};
    const dbOrdersByStatus: Record<string, OrdersResponse[]> = {};
    
    dbOrders.items.forEach((order: OrdersResponse) => {
      const statusName = (order.expand?.status as any)?.name || 'Unknown Status';
      const statusId = order.status;
      
      dbStatusDistribution[statusName] = (dbStatusDistribution[statusName] || 0) + 1;
      
      if (!dbOrdersByStatus[statusName]) {
        dbOrdersByStatus[statusName] = [];
      }
      dbOrdersByStatus[statusName].push(order);
    });
    
    console.log('\n📈 Database Status Distribution:');
    Object.entries(dbStatusDistribution).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} orders`);
    });
    
    // Show recent orders
    console.log('\n📝 Recent Database Orders (last 10):');
    dbOrders.items.slice(0, 10).forEach((order: OrdersResponse) => {
      const statusName = (order.expand?.status as any)?.name || 'Unknown';
      console.log(`  Order #${order.orderNumber}: ${statusName} (Created: ${new Date(order.created).toLocaleDateString()})`);
    });
    
    return {
      totalOrders: dbOrders.items.length,
      statusDistribution: dbStatusDistribution,
      recentOrders: dbOrders.items.slice(0, 10)
    };
    
  } catch (error) {
    console.error('❌ Error analyzing database orders:', error);
    return {
      totalOrders: 0,
      statusDistribution: {},
      recentOrders: []
    };
  }
}

async function compareApiWithDatabase(apiResults: TestResults[], dbResults: any) {
  console.log('\n🔍 Comparing API results with Database...');
  
  // Find the best API result (most orders)
  const bestApiResult = apiResults.reduce((best, current) => 
    current.ordersCount > best.ordersCount ? current : best
  );
  
  console.log(`\n📊 Comparison Summary:`);
  console.log(`  Database Orders: ${dbResults.totalOrders}`);
  console.log(`  Best API Result (types=${bestApiResult.typesParam}): ${bestApiResult.ordersCount} orders`);
  console.log(`  Difference: ${bestApiResult.ordersCount - dbResults.totalOrders} orders`);
  
  if (bestApiResult.ordersCount > dbResults.totalOrders) {
    console.log(`  ⚠️  API has MORE orders than database - possible sync issues`);
  } else if (bestApiResult.ordersCount < dbResults.totalOrders) {
    console.log(`  ⚠️  Database has MORE orders than API - possible old data`);
  } else {
    console.log(`  ✅ API and database have same number of orders`);
  }
  
  console.log(`\n📈 API Status Distribution (types=${bestApiResult.typesParam}):`);
  Object.entries(bestApiResult.statusDistribution).forEach(([status, count]) => {
    console.log(`  Status ${status}: ${count} orders`);
  });
}

async function testDateRanges() {
  console.log('\n📅 Testing different date ranges...');
  
  const dateRanges = [
    { name: '7 days', days: 7 },
    { name: '30 days', days: 30 },
    { name: '60 days', days: 60 },
    { name: '90 days', days: 90 }
  ];
  
  for (const range of dateRanges) {
    try {
      const today = new Date();
      const startDate = new Date(today.getTime() - range.days * 24 * 60 * 60 * 1000);
      
      const from = startDate.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];
      
      console.log(`  📆 Testing ${range.name} (${from} to ${to})...`);
      
      const orders = await getOrders({ 
        types: 1, 
        from: from, 
        to: to,
        page: 1 
      });
      
      console.log(`    ✅ Found ${orders.length} orders in last ${range.days} days`);
      
    } catch (error) {
      console.error(`    ❌ Error testing ${range.name}:`, error);
    }
  }
}

async function main() {
  console.log('🚀 Starting Comprehensive Rozetka Sync Analysis...\n');
  console.log(`📅 Analysis started at: ${new Date().toLocaleString()}\n`);
  
  try {
    // Ensure we have a valid token
    console.log('🔐 Ensuring valid API token...');
    await ensureValidToken();
    console.log('✅ API token is valid\n');
    
    // Test different types parameter values
    console.log('🧪 Testing different types parameter values...');
    const typesToTest = [null, 1, 2, 3, 4, 5, 6];
    const apiResults: TestResults[] = [];
    
    for (const typesValue of typesToTest) {
      const result = await testTypesParameter(typesValue);
      apiResults.push(result);
    }
    
    // Analyze database orders
    const dbResults = await analyzeDatabaseOrders();
    
    // Test different date ranges
    await testDateRanges();
    
    // Compare results
    await compareApiWithDatabase(apiResults, dbResults);
    
    // Print comprehensive summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 COMPREHENSIVE ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    
    console.log('\n🔍 API Results by Types Parameter:');
    apiResults.forEach(result => {
      console.log(`  types=${result.typesParam}: ${result.ordersCount} orders across ${result.pagesChecked} pages`);
      if (Object.keys(result.statusDistribution).length > 0) {
        console.log(`    Status distribution: ${JSON.stringify(result.statusDistribution)}`);
      }
    });
    
    console.log(`\n💾 Database Analysis:`);
    console.log(`  Total orders: ${dbResults.totalOrders}`);
    console.log(`  Status distribution: ${JSON.stringify(dbResults.statusDistribution)}`);
    
    // Recommendations based on results
    console.log('\n💡 RECOMMENDATIONS:');
    
    const bestResult = apiResults.reduce((best, current) => 
      current.ordersCount > best.ordersCount ? current : best
    );
    
    console.log(`✅ Use types=${bestResult.typesParam} for maximum order coverage (${bestResult.ordersCount} orders)`);
    
    if (bestResult.pagesChecked > 1) {
      console.log(`✅ Implement pagination - found orders across ${bestResult.pagesChecked} pages`);
    }
    
    if (bestResult.ordersCount > dbResults.totalOrders) {
      console.log(`⚠️  Sync missing ${bestResult.ordersCount - dbResults.totalOrders} orders - fix sync logic`);
    }
    
    console.log(`\n📅 Analysis completed at: ${new Date().toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️  Analysis interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Analysis terminated');
  process.exit(1);
});

main();