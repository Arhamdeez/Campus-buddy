import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const AnnouncementsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-gray-600">Stay updated with campus news and events</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campus Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Announcements feature coming soon!</p>
            <p className="text-gray-400 mt-2">
              Official announcements from societies and administration will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnouncementsPage;
