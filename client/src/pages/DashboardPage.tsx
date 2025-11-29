import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  MapPinIcon,
  TrophyIcon,
  UserGroupIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isConnected, onlineUsers } = useSocket();

  const quickActions = [
    {
      name: 'Chat',
      description: 'Join the campus conversation',
      href: '/chat',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Announcements',
      description: 'View latest updates',
      href: '/announcements',
      icon: SpeakerWaveIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Lost & Found',
      description: 'Report or find items',
      href: '/lost-found',
      icon: MagnifyingGlassIcon,
      color: 'bg-yellow-500',
    },
    {
      name: 'Feedback',
      description: 'Share your thoughts',
      href: '/feedback',
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
    },
    {
      name: 'Confessions',
      description: 'Share anonymously',
      href: '/confessions',
      icon: HeartIcon,
      color: 'bg-pink-500',
    },
    {
      name: 'Mood Tracker',
      description: 'Track your study mood',
      href: '/mood',
      icon: FaceSmileIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Campus Status',
      description: 'Check facility status',
      href: '/status',
      icon: MapPinIcon,
      color: 'bg-indigo-500',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {user?.name}! 👋
        </h1>
        <p className="text-gray-600">
          Welcome to Campus Buddy - your context-aware student assistant
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  isConnected ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <div className={`h-3 w-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Connection Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Online Users</p>
                <p className="text-lg font-semibold text-gray-900">
                  {onlineUsers.size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrophyIcon className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Your Points</p>
                <p className="text-lg font-semibold text-gray-900">
                  {user?.points || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="group block"
            >
              <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg ${action.color} flex items-center justify-center`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600">
                        {action.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-gray-500">
                Your recent activity will appear here once you start using Campus Buddy features.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Try sending a message in chat or reporting a lost item to get started!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
