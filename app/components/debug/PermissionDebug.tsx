'use client';

import { useState } from 'react';
import { useSession } from '@/app/hooks/useSession';
import { getOrders } from '@/app/[locale]/orders/actions/orders';

export default function PermissionDebug() {
  const { user, isAuthenticated } = useSession();
  const [testResult, setTestResult] = useState<string>('');
  
  const testOrdersFetch = async () => {
    try {
      setTestResult('🔄 Testing orders fetch...');
      const result = await getOrders();
      
      if (result.error) {
        setTestResult(`❌ Error: ${result.error}`);
      } else {
        setTestResult(`✅ Success! Fetched ${result.data?.length || 0} orders without auth switch`);
      }
    } catch (error) {
      setTestResult(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  return (
    <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-300 dark:border-green-700">
      <h3 className="text-lg font-semibold mb-3 text-green-800 dark:text-green-200">
        🎉 Authentication Fixed!
      </h3>
      <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
        <p><strong>Current user:</strong> {user?.email || 'None'}</p>
        <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        
        <div className="mt-3">
          <button
            onClick={testOrdersFetch}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Test Orders Fetch
          </button>
          
          {testResult && (
            <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs">
              {testResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}