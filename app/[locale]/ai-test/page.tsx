'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { Button } from "@/app/components/shared/ui/button";
import { PageHeader } from '@/app/components/shared/ui/page-header';

interface ApiResponse {
  success: boolean;
  message?: string;
  response?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export default function AiTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/test');
      const data = await response.json();
      
      setResult(data);
      if (!data.success) {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        heading="OpenAI API Test"
        subheading="Test the OpenAI API connection"
      />
      
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>API Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testConnection} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test OpenAI Connection'}
            </Button>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-800 rounded-md border border-red-200">
                <h3 className="font-medium">Error</h3>
                <p>{error}</p>
                {result && result.details && (
                  <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-red-100 rounded">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
            
            {result && result.success && (
              <div className="p-4 bg-green-50 text-green-800 rounded-md border border-green-200">
                <h3 className="font-medium">Success!</h3>
                <p>{result.message}</p>
                <div className="mt-2 p-3 bg-white rounded border">
                  <h4 className="text-sm font-medium mb-1">AI Response:</h4>
                  <p className="text-gray-700">{result.response}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 