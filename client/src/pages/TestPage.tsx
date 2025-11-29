import React, { useState } from 'react';
import { authApi } from '../services/api';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const TestPage: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<string>('Not tested');
  const [loading, setLoading] = useState(false);

  const testApiConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      
      if (data.success) {
        setApiStatus('✅ API Connection Successful');
      } else {
        setApiStatus('❌ API Connection Failed');
      }
    } catch (error) {
      setApiStatus(`❌ API Connection Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testAuthEndpoint = async () => {
    setLoading(true);
    try {
      const response = await authApi.post('/register', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        batch: '22L-TEST'
      });
      
      if (response.data.success) {
        setApiStatus('✅ Auth Endpoint Working');
      } else {
        setApiStatus('❌ Auth Endpoint Failed');
      }
    } catch (error: any) {
      setApiStatus(`❌ Auth Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Campus Buddy API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Test the connection between frontend and backend
            </p>
            
            <div className="mb-4 p-3 bg-gray-100 rounded-md">
              <p className="text-sm font-medium">Status:</p>
              <p className="text-sm">{apiStatus}</p>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={testApiConnection}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Test Health Endpoint'}
              </Button>
              
              <Button 
                onClick={testAuthEndpoint}
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                {loading ? 'Testing...' : 'Test Auth Endpoint'}
              </Button>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              <p>Frontend: http://localhost:5174</p>
              <p>Backend: http://localhost:3001</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestPage;
