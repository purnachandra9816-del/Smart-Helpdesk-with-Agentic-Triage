import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ticketApi } from '../../lib/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Plus, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Ticket {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  createdBy: {
    name: string;
    email: string;
  };
  assignee?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function TicketList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFilters] = React.useState({
    status: searchParams.get('status') || '',
    category: searchParams.get('category') || '',
    myTickets: user?.role === 'user' ? 'true' : searchParams.get('myTickets') || ''
  });

  const fetchTickets = React.useCallback(async () => {
    try {
      const params = {
        ...filters,
        page: 1,
        limit: 50
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key as keyof typeof params]) {
          delete params[key as keyof typeof params];
        }
      });

      const response = await ticketApi.getTickets(params);
      setTickets(response.data.tickets);
    } catch (error) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'primary';
      case 'triaged': return 'default';
      case 'waiting_human': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'low': return 'default';
      case 'medium': return 'primary';
      case 'high': return 'warning';
      case 'urgent': return 'danger';
      default: return 'default';
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'user' 
              ? 'View and manage your support requests'
              : 'Manage customer support tickets'
            }
          </p>
        </div>
        
        {user?.role === 'user' && (
          <Button onClick={() => navigate('/tickets/create')} className="mt-4 sm:mt-0">
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center space-x-4">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="triaged">Triaged</option>
                <option value="waiting_human">Waiting Human</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                <option value="billing">Billing</option>
                <option value="tech">Technical</option>
                <option value="shipping">Shipping</option>
                <option value="other">Other</option>
              </select>

              {user?.role !== 'user' && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.myTickets === 'true'}
                    onChange={(e) => handleFilterChange('myTickets', e.target.checked ? 'true' : '')}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">My Tickets Only</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </p>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-sm">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Filter className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery ? 
                  'Try adjusting your search or filters to find what you\'re looking for.' :
                  'There are no tickets matching your current filters.'
                }
              </p>
              {user?.role === 'user' && !searchQuery && (
                <Button onClick={() => navigate('/tickets/create')}>
                  Create Your First Ticket
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket._id}
                onClick={() => navigate(`/tickets/${ticket._id}`)}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600">
                        {ticket.title}
                      </h3>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={getPriorityVariant(ticket.priority)} size="sm">
                        {ticket.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {ticket.description}
                    </p>
                    
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span>Category: {ticket.category}</span>
                      <span>Created by: {ticket.createdBy.name}</span>
                      {ticket.assignee && (
                        <span>Assigned to: {ticket.assignee.name}</span>
                      )}
                      <span>
                        Created: {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}