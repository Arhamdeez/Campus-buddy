import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const FeedbackPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feedback & Confessions</h1>
        <p className="text-gray-600">Share anonymous feedback, complaints, or confessions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anonymous Feedback Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Feedback feature coming soon!</p>
            <p className="text-gray-400 mt-2">
              Submit anonymous feedback, complaints, and confessions safely.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackPage;
