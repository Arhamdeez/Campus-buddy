import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const LostFoundPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lost & Found</h1>
        <p className="text-gray-600">Report lost items or help others find their belongings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lost & Found Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Lost & Found feature coming soon!</p>
            <p className="text-gray-400 mt-2">
              Report lost items and help others recover their belongings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LostFoundPage;
