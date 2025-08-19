import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Ticket, 
  BookOpen, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const stats = {
    user: [
      { name: 'My Tickets', value: '3', icon: Ticket, color: 'bg-blue-500' },
      { name: 'Open Issues', value: '1', icon: AlertCircle, color: 'bg-yellow-500' },
      { name: 'Resolved', value: '2', icon: CheckCircle, color: 'bg-green-500' },
      { name: 'Avg Response', value: '4.2h', icon: Clock, color: 'bg-purple-500' },
    ],
    agent: [
      { name: 'Assigned Tickets', value: '12', icon: Ticket, color: 'bg-blue-500' },
      { name: 'Pending Review', value: '5', icon: AlertCircle, color: 'bg-yellow-500' },
      { name: 'Resolved Today', value: '8', icon: CheckCircle, color: 'bg-green-500' },
      { name: 'KB Articles', value: '24', icon: BookOpen, color: 'bg-purple-500' },
    ],
    admin: [
      { name: 'Total Tickets', value: '156', icon: Ticket, color: 'bg-blue-500' },
      { name: 'Active Users', value: '89', icon: Users, color: 'bg-green-500' },
      { name: 'Auto-Resolved', value: '78%', icon: TrendingUp, color: 'bg-purple-500' },
      { name: 'Avg Confidence', value: '0.82', icon: BarChart3, color: 'bg-orange-500' },
    ],
  };

  const currentStats = stats[user?.role || 'user'];

  const recentActivity = [
    {
      id: 1,
      action: 'Ticket #1234 was auto-resolved',
      time: '2 minutes ago',
      type: 'success'
    },
    {
      id: 2,
      action: 'New ticket created: "Payment issue"',
      time: '15 minutes ago',
      type: 'info'
    },
    {
      id: 3,
      action: 'Agent suggestion approved for Ticket #1232',
      time: '1 hour ago',
      type: 'success'
    },
    {
      id: 4,
      action: 'KB article "Billing FAQ" was updated',
      time: '2 hours ago',
      type: 'info'
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name}
        </h1>
        <p className="text-gray-600 mt-2">
          {user?.role === 'admin' && "Manage your helpdesk system and monitor performance"}
          {user?.role === 'agent' && "Review tickets and provide support to customers"}
          {user?.role === 'user' && "Track your support tickets and find help"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {currentStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-md ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-4">
            {user?.role === 'user' && (
              <>
                <a
                  href="/tickets/create"
                  className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Ticket className="w-8 h-8 text-blue-600 mr-4" />
                  <div>
                    <h3 className="font-medium text-gray-900">Create New Ticket</h3>
                    <p className="text-sm text-gray-600">Get help with your issue</p>
                  </div>
                </a>
                <a
                  href="/kb"
                  className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <BookOpen className="w-8 h-8 text-green-600 mr-4" />
                  <div>
                    <h3 className="font-medium text-gray-900">Browse Knowledge Base</h3>
                    <p className="text-sm text-gray-600">Find answers quickly</p>
                  </div>
                </a>
              </>
            )}
            
            {(user?.role === 'agent' || user?.role === 'admin') && (
              <>
                <a
                  href="/tickets?status=waiting_human"
                  className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <AlertCircle className="w-8 h-8 text-yellow-600 mr-4" />
                  <div>
                    <h3 className="font-medium text-gray-900">Review Pending Tickets</h3>
                    <p className="text-sm text-gray-600">5 tickets need attention</p>
                  </div>
                </a>
                <a
                  href="/kb/create"
                  className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <BookOpen className="w-8 h-8 text-purple-600 mr-4" />
                  <div>
                    <h3 className="font-medium text-gray-900">Create KB Article</h3>
                    <p className="text-sm text-gray-600">Share knowledge with the team</p>
                  </div>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`
                    w-2 h-2 rounded-full mt-2 flex-shrink-0
                    ${activity.type === 'success' ? 'bg-green-400' : 'bg-blue-400'}
                  `} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <a
                href="/tickets"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all activity →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}