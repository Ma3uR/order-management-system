'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import RozetkaAPI from '@/app/lib/rozetka';
import { RozetkaOrderResponse } from '@/app/types/orders';

export default function TestRozetka() {
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
    data?: { token?: string; orders?: RozetkaOrderResponse[] };
  }>({ status: 'idle' });

  const testConnection = async () => {
    setTestResult({ status: 'loading' });
    try {
      const api = RozetkaAPI.getInstance();
      const token = await api.authenticate();
      
      setTestResult({ 
        status: 'success', 
        message: 'Successfully authenticated!',
        data: { token: token ?? undefined }
      });
    } catch (error) {
      console.error('Authentication error:', error);
      setTestResult({ 
        status: 'error', 
        message: `Authentication failed: ${(error as Error).message}`
      });
    }
  };

  const testGetOrders = async () => {
    setTestResult({ status: 'loading' });
    try {
      const api = RozetkaAPI.getInstance();
      const orders = await api.getOrders();
      
      setTestResult({ 
        status: 'success', 
        message: `Successfully fetched ${orders.length} orders!`,
        data: { orders }
      });
    } catch (error) {
      console.error('Get orders error:', error);
      setTestResult({ 
        status: 'error', 
        message: `Failed to fetch orders: ${(error as Error).message}`
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Rozetka API Test Page</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testConnection}
              disabled={testResult.status === 'loading'}
            >
              {testResult.status === 'loading' ? 'Testing...' : 'Test Connection'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Get Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testGetOrders}
              disabled={testResult.status === 'loading'}
            >
              {testResult.status === 'loading' ? 'Fetching...' : 'Fetch Orders'}
            </Button>
          </CardContent>
        </Card>

        {testResult.status !== 'idle' && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Test Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-md ${
                testResult.status === 'success' ? 'bg-green-50' : 
                testResult.status === 'error' ? 'bg-red-50' : 
                'bg-blue-50'
              }`}>
                <p className="font-medium mb-2">
                  Status: {testResult.status.toUpperCase()}
                </p>
                {testResult.message && (
                  <p className="mb-2">{testResult.message}</p>
                )}
                {testResult.data && (
                  <pre className="bg-white p-4 rounded-md overflow-auto max-h-96">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 