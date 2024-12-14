'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RozetkaAPI from '@/lib/rozetka';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function TestRozetka() {
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
    data?: any;
  }>({ status: 'idle' });

  const testConnection = async () => {
    setTestResult({ status: 'loading' });
    try {
      const api = RozetkaAPI.getInstance();
      const token = await api.authenticate();
      
      setTestResult({ 
        status: 'success', 
        message: 'Successfully authenticated!',
        data: { token }
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
    <div className="min-h-screen flex flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h1 className="text-2xl font-bold">Rozetka API Test Page</h1>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-card">
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

          <Card className="bg-card">
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
            <Card className="md:col-span-2 bg-card">
              <CardHeader>
                <CardTitle>Test Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-md ${
                  testResult.status === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 
                  testResult.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : 
                  'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <p className="font-medium mb-2">
                    Status: {testResult.status.toUpperCase()}
                  </p>
                  {testResult.message && (
                    <p className="mb-2">{testResult.message}</p>
                  )}
                  {testResult.data && (
                    <pre className="bg-background dark:bg-gray-800 p-4 rounded-md overflow-auto max-h-96">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
} 