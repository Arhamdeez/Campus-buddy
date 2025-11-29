import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import type { LostFoundItem } from '@shared/types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const CATEGORIES = ['electronics', 'clothing', 'books', 'accessories', 'documents', 'other'];
const STATUSES = ['lost', 'found', 'returned'];

const LostFoundPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LostFoundItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as LostFoundItem['category'],
    status: 'lost' as LostFoundItem['status'],
    location: '',
    contactInfo: '',
    imageUrl: '',
  });

  // Fetch items
  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['lost-found', searchQuery, statusFilter, categoryFilter],
    queryFn: async () => {
      const response = await apiService.lostFound.getAll({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        limit: 50,
      });
      return response.data.data;
    },
    retry: false,
  });

  const items: LostFoundItem[] = itemsData?.data || [];

  // Load from localStorage on mount
  const [localItems, setLocalItems] = useState<LostFoundItem[]>(() => {
    try {
      const stored = localStorage.getItem('demo_lostfound');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Combine API and local items
  const allItems = useMemo(() => {
    const combined = [...items];
    localItems.forEach(local => {
      if (!combined.find(i => i.id === local.id)) {
        combined.push(local);
      }
    });
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [items, localItems]);

  // Auto-populate dummy data on first load if empty (for evaluation/demo)
  useEffect(() => {
    if (allItems.length === 0) {
      const dummyItems: LostFoundItem[] = [
        {
          id: 'demo_lf_1',
          title: 'Lost iPhone 14 Pro',
          description: 'Lost my iPhone 14 Pro with a black case. Last seen in the library around 3 PM yesterday. Has a distinctive sticker on the back. Please contact if found!',
          category: 'electronics',
          status: 'lost',
          location: 'Main Library, 2nd Floor',
          contactInfo: 'sarah.student@campus.edu',
          reporterId: 'user_sarah',
          reporterName: 'Sarah',
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'demo_lf_2',
          title: 'Found Blue Backpack',
          description: 'Found a blue Nike backpack near the cafeteria. Contains notebooks, pens, and a water bottle. Please describe the contents to claim.',
          category: 'accessories',
          status: 'found',
          location: 'Cafeteria, Main Building',
          contactInfo: 'ahmed.found@campus.edu',
          reporterId: 'user_ahmed',
          reporterName: 'Ahmed',
          timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'demo_lf_3',
          title: 'Lost Student ID Card',
          description: 'Lost my student ID card. Name: John Smith, Batch: 22L-3456. Please return to the admin office or contact me directly.',
          category: 'documents',
          status: 'lost',
          location: 'Near Building A',
          contactInfo: 'john.smith@campus.edu',
          reporterId: 'user_john',
          reporterName: 'John',
          timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'demo_lf_4',
          title: 'Found Laptop Charger',
          description: 'Found a MacBook Pro charger (MagSafe 2) in the study hall. Left it at the front desk. Please come with proof of ownership.',
          category: 'electronics',
          status: 'found',
          location: 'Study Hall, Building B',
          contactInfo: 'maria.helper@campus.edu',
          reporterId: 'user_maria',
          reporterName: 'Maria',
          timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'demo_lf_5',
          title: 'Lost Black Wallet',
          description: 'Lost a black leather wallet containing cash and cards. Last seen in the gym locker room. Reward offered for return!',
          category: 'accessories',
          status: 'lost',
          location: 'Gym, Sports Complex',
          contactInfo: 'david.lost@campus.edu',
          reporterId: 'user_david',
          reporterName: 'David',
          timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'demo_lf_6',
          title: 'Found Textbooks - Calculus & Physics',
          description: 'Found two textbooks: "Calculus Early Transcendentals" and "University Physics". Both have notes inside. Please contact to identify.',
          category: 'books',
          status: 'found',
          location: 'Classroom 201, Building C',
          contactInfo: 'lisa.found@campus.edu',
          reporterId: 'user_lisa',
          reporterName: 'Lisa',
          timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'demo_lf_7',
          title: 'Lost AirPods Pro (2nd Gen)',
          description: 'Lost my AirPods Pro in a white case. Last connected near the library. Please check "Find My" app or contact me if found.',
          category: 'electronics',
          status: 'lost',
          location: 'Library, Ground Floor',
          contactInfo: 'mike.lost@campus.edu',
          reporterId: 'user_mike',
          reporterName: 'Mike',
          timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'demo_lf_8',
          title: 'Found Blue Hoodie',
          description: 'Found a blue hoodie with "Campus University" logo in the cafeteria. Size appears to be Medium. Please describe to claim.',
          category: 'clothing',
          status: 'found',
          location: 'Cafeteria, Main Building',
          contactInfo: 'emma.found@campus.edu',
          reporterId: 'user_emma',
          reporterName: 'Emma',
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
        },
      ];
      setLocalItems(dummyItems);
      localStorage.setItem('demo_lostfound', JSON.stringify(dummyItems));
    }
  }, [allItems.length]);

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiService.lostFound.create(data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Item reported successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to report item');
    },
  });

  // Update item mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LostFoundItem> }) => {
      const response = await apiService.lostFound.update(id, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] });
      setIsEditModalOpen(false);
      setEditingItem(null);
      resetForm();
      toast.success('Item updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update item');
    },
  });

  // Mark as returned mutation
  const markReturnedMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.lostFound.markReturned(id);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] });
      toast.success('Item marked as returned!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to mark item as returned');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiService.lostFound.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] });
      toast.success('Item deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete item');
    },
  });

  // Add dummy lost & found items mutation
  const addDummyItemsMutation = useMutation({
    mutationFn: async () => {
      const dummyItems = [
        {
          title: 'Lost iPhone 14 Pro',
          description: 'Lost my iPhone 14 Pro with a black case. Last seen in the library around 3 PM yesterday. Has a distinctive sticker on the back. Please contact if found!',
          category: 'electronics' as LostFoundItem['category'],
          status: 'lost' as LostFoundItem['status'],
          location: 'Main Library, 2nd Floor',
          contactInfo: 'sarah.student@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Found Blue Backpack',
          description: 'Found a blue Nike backpack near the cafeteria. Contains notebooks, pens, and a water bottle. Please describe the contents to claim.',
          category: 'accessories' as LostFoundItem['category'],
          status: 'found' as LostFoundItem['status'],
          location: 'Cafeteria, Main Building',
          contactInfo: 'ahmed.found@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Lost Student ID Card',
          description: 'Lost my student ID card. Name: John Smith, Batch: 22L-3456. Please return to the admin office or contact me directly.',
          category: 'documents' as LostFoundItem['category'],
          status: 'lost' as LostFoundItem['status'],
          location: 'Near Building A',
          contactInfo: 'john.smith@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Found Laptop Charger',
          description: 'Found a MacBook Pro charger (MagSafe 2) in the study hall. Left it at the front desk. Please come with proof of ownership.',
          category: 'electronics' as LostFoundItem['category'],
          status: 'found' as LostFoundItem['status'],
          location: 'Study Hall, Building B',
          contactInfo: 'maria.helper@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Lost Black Wallet',
          description: 'Lost a black leather wallet containing cash and cards. Last seen in the gym locker room. Reward offered for return!',
          category: 'accessories' as LostFoundItem['category'],
          status: 'lost' as LostFoundItem['status'],
          location: 'Gym, Sports Complex',
          contactInfo: 'david.lost@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Found Textbooks - Calculus & Physics',
          description: 'Found two textbooks: "Calculus Early Transcendentals" and "University Physics". Both have notes inside. Please contact to identify.',
          category: 'books' as LostFoundItem['category'],
          status: 'found' as LostFoundItem['status'],
          location: 'Classroom 201, Building C',
          contactInfo: 'lisa.found@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Lost AirPods Pro (2nd Gen)',
          description: 'Lost my AirPods Pro in a white case. Last connected near the library. Please check "Find My" app or contact me if found.',
          category: 'electronics' as LostFoundItem['category'],
          status: 'lost' as LostFoundItem['status'],
          location: 'Library, Ground Floor',
          contactInfo: 'mike.lost@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Found Blue Hoodie',
          description: 'Found a blue hoodie with "Campus University" logo in the cafeteria. Size appears to be Medium. Please describe to claim.',
          category: 'clothing' as LostFoundItem['category'],
          status: 'found' as LostFoundItem['status'],
          location: 'Cafeteria, Main Building',
          contactInfo: 'emma.found@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Lost Keys with Keychain',
          description: 'Lost a set of keys with a red keychain and a small USB drive attached. Very important! Please return to admin office.',
          category: 'other' as LostFoundItem['category'],
          status: 'lost' as LostFoundItem['status'],
          location: 'Parking Lot, Near Gate 2',
          contactInfo: 'robert.lost@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Found Sunglasses',
          description: 'Found a pair of black Ray-Ban sunglasses in the study hall. Left at the reception desk.',
          category: 'accessories' as LostFoundItem['category'],
          status: 'found' as LostFoundItem['status'],
          location: 'Study Hall, Building B',
          contactInfo: 'sophia.found@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Lost Calculator - TI-84 Plus',
          description: 'Lost my TI-84 Plus calculator. It has a small scratch on the screen. Needed for upcoming exams. Please help!',
          category: 'electronics' as LostFoundItem['category'],
          status: 'lost' as LostFoundItem['status'],
          location: 'Math Building, Room 305',
          contactInfo: 'alex.lost@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Found Water Bottle',
          description: 'Found a blue Hydro Flask water bottle with stickers. Left at the gym reception.',
          category: 'accessories' as LostFoundItem['category'],
          status: 'found' as LostFoundItem['status'],
          location: 'Gym, Sports Complex',
          contactInfo: 'jessica.found@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Lost Watch - Apple Watch Series 8',
          description: 'Lost my Apple Watch Series 8 with a black sport band. Last synced near the cafeteria. Please contact if found!',
          category: 'electronics' as LostFoundItem['category'],
          status: 'lost' as LostFoundItem['status'],
          location: 'Cafeteria Area',
          contactInfo: 'ryan.lost@campus.edu',
          imageUrl: '',
        },
        {
          title: 'Found Umbrella',
          description: 'Found a black umbrella with a wooden handle in the library. Please describe to claim.',
          category: 'accessories' as LostFoundItem['category'],
          status: 'found' as LostFoundItem['status'],
          location: 'Library, Entrance',
          contactInfo: 'olivia.found@campus.edu',
          imageUrl: '',
        },
      ];

      // Create all dummy items
      const promises = dummyItems.map((item) =>
        apiService.lostFound.create(item).catch((err) => {
          console.warn('Failed to create dummy item:', err);
          return null;
        })
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] });
      toast.success('Dummy items added successfully!', { duration: 3000 });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add dummy items');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'other',
      status: 'lost',
      location: '',
      contactInfo: '',
      imageUrl: '',
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEdit = (item: LostFoundItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      location: item.location,
      contactInfo: item.contactInfo,
      imageUrl: item.imageUrl || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateMutation.mutate({
      id: editingItem.id,
      data: formData,
    });
  };

  const handleMarkReturned = (id: string) => {
    if (window.confirm('Mark this item as returned?')) {
      markReturnedMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: LostFoundItem['status']) => {
    switch (status) {
      case 'lost':
        return 'bg-red-100 text-red-800';
      case 'found':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: LostFoundItem['category']) => {
    switch (category) {
      case 'electronics':
        return '📱';
      case 'clothing':
        return '👕';
      case 'books':
        return '📚';
      case 'accessories':
        return '👜';
      case 'documents':
        return '📄';
      default:
        return '📦';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lost & Found</h1>
          <p className="text-gray-600">Report lost items or help others find their belongings</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => addDummyItemsMutation.mutate()}
            disabled={addDummyItemsMutation.isPending}
            loading={addDummyItemsMutation.isPending}
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Add Demo Data
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Report Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
              {(statusFilter || categoryFilter) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('');
                    setCategoryFilter('');
                  }}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading items...</p>
        </div>
      ) : allItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 text-lg">No items found</p>
            <p className="text-gray-400 mt-2">
              {searchQuery || statusFilter || categoryFilter
                ? 'Try adjusting your filters'
                : 'Be the first to report a lost or found item!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

                <div className="space-y-1 mb-3 text-xs text-gray-500">
                  <p>📍 {item.location}</p>
                  <p>👤 {item.reporterName} ({item.reporterId === user?.id ? 'You' : item.reporterName})</p>
                  <p>🕒 {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</p>
                </div>

                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                )}

                <div className="flex gap-2 mt-4">
                  {item.status !== 'returned' && item.reporterId === user?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkReturned(item.id)}
                      disabled={markReturnedMutation.isPending}
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Mark Returned
                    </Button>
                  )}
                  {item.reporterId === user?.id && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {item.contactInfo && (
                  <div className="mt-3 pt-3 border-t text-xs">
                    <p className="text-gray-600">
                      <strong>Contact:</strong> {item.contactInfo}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Report Lost or Found Item"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="e.g., Lost iPhone 14"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="input"
              placeholder="Describe the item in detail..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as LostFoundItem['category'] })}
                required
                className="input"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as LostFoundItem['status'] })}
                required
                className="input"
              >
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </div>
          </div>
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
            placeholder="e.g., Library, Building A, Room 201"
          />
          <Input
            label="Contact Information"
            value={formData.contactInfo}
            onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
            required
            placeholder="Email or phone number"
          />
          <Input
            label="Image URL (optional)"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Report Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
          resetForm();
        }}
        title="Edit Item"
        size="lg"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as LostFoundItem['category'] })}
                required
                className="input"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
          </div>
          <Input
            label="Contact Information"
            value={formData.contactInfo}
            onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
            required
          />
          <Input
            label="Image URL (optional)"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingItem(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Update Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LostFoundPage;
