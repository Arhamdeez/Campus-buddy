import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import type { AnonymousFeedback } from '@shared/types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  SparklesIcon,
  XMarkIcon,
  CheckCircleIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const FEEDBACK_TYPES = ['feedback', 'complaint'] as const; // Removed confession
const CATEGORIES = ['general', 'academic', 'facilities', 'food', 'events', 'other'];
const STATUSES = ['pending', 'reviewed', 'resolved'];
const PRIORITIES = ['low', 'medium', 'high'] as const;

const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    type: 'feedback' as AnonymousFeedback['type'],
    title: '',
    content: '',
    category: 'general',
    priority: 'medium' as AnonymousFeedback['priority'],
  });

  const isAdmin = user?.role === 'admin';

  // Fetch feedback (exclude confessions)
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['feedback', typeFilter, statusFilter, categoryFilter],
    queryFn: async () => {
      const response = await apiService.feedback.getAll({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        limit: 50,
      });
      // Filter out confessions on the client side
      const filtered = response.data.data.filter(
        (item: AnonymousFeedback) => item.type !== 'confession'
      );
      return { ...response.data, data: filtered };
    },
    retry: false,
  });

  const feedback: AnonymousFeedback[] = feedbackData?.data || [];

  // Load from localStorage on mount
  const [localFeedback, setLocalFeedback] = useState<AnonymousFeedback[]>(() => {
    try {
      const stored = localStorage.getItem('demo_feedback');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Combine API and local feedback
  const allFeedback = useMemo(() => {
    const combined = [...feedback];
    localFeedback.forEach((local) => {
      if (!combined.find((f) => f.id === local.id)) {
        combined.push(local);
      }
    });
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [feedback, localFeedback]);

  // Apply type/status/category + search filters on the combined list so that
  // local feedback is filtered correctly as well.
  const filteredFeedback = useMemo(() => {
    let data = [...allFeedback];

    if (typeFilter) {
      data = data.filter((item) => item.type === typeFilter);
    }

    if (statusFilter) {
      data = data.filter((item) => item.status === statusFilter);
    }

    if (categoryFilter) {
      data = data.filter((item) => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q),
      );
    }

    return data;
  }, [allFeedback, typeFilter, statusFilter, categoryFilter, searchQuery]);

  // Auto-populate sample data on first load if empty (for evaluation/testing)
  useEffect(() => {
    if (allFeedback.length === 0) {
      const dummyFeedback: AnonymousFeedback[] = [
        {
          id: 'demo_fb_1',
          type: 'feedback',
          title: 'Great Library Facilities',
          content: 'I wanted to express my appreciation for the library facilities. The quiet study areas and the availability of resources have been really helpful for my studies. Keep up the great work!',
          category: 'facilities',
          priority: 'low',
          status: 'resolved',
          timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
          upvotes: 15,
          downvotes: 0,
        },
        {
          id: 'demo_fb_2',
          type: 'complaint',
          title: 'Cafeteria Food Quality',
          content: 'The food quality in the cafeteria has been declining recently. Many students have noticed that the meals are often cold and the variety has decreased. Could you please look into this?',
          category: 'food',
          priority: 'high',
          status: 'pending',
          timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
          upvotes: 42,
          downvotes: 3,
        },
        {
          id: 'demo_fb_3',
          type: 'feedback',
          title: 'Event Organization Appreciation',
          content: 'The recent hackathon event was amazing! Great organization, good food, and excellent prizes. Thank you to everyone who made it possible. Looking forward to more events like this!',
          category: 'events',
          priority: 'low',
          status: 'resolved',
          timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
          upvotes: 28,
          downvotes: 1,
        },
        {
          id: 'demo_fb_4',
          type: 'complaint',
          title: 'WiFi Connectivity Issues',
          content: 'The WiFi in Building B has been very unstable for the past week. It keeps disconnecting during online classes and exams. This is affecting our learning experience. Please fix this urgently.',
          category: 'facilities',
          priority: 'high',
          status: 'reviewed',
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
          upvotes: 67,
          downvotes: 2,
        },
        {
          id: 'demo_fb_5',
          type: 'feedback',
          title: 'Professor Appreciation',
          content: 'I wanted to thank Professor Smith for being so understanding and helpful during office hours. Their teaching style really helps me understand the material better.',
          category: 'academic',
          priority: 'low',
          status: 'resolved',
          timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
          upvotes: 19,
          downvotes: 0,
        },
        {
          id: 'demo_fb_6',
          type: 'complaint',
          title: 'Parking Space Issues',
          content: 'There are never enough parking spaces, especially during peak hours. I often have to park far away and walk a long distance. Could we have more parking spaces or a better system?',
          category: 'facilities',
          priority: 'medium',
          status: 'pending',
          timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
          upvotes: 34,
          downvotes: 5,
        },
      ];
      setLocalFeedback(dummyFeedback);
      localStorage.setItem('demo_feedback', JSON.stringify(dummyFeedback));
    }
  }, [allFeedback.length]);

  // Create feedback mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiService.feedback.create(data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Feedback submitted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit feedback');
    },
  });

  // Helper to get current user's vote for a given feedback item (local mode)
  const getUserVoteForFeedback = (id: string): 'up' | 'down' | null => {
    const userId = user?.id || 'anonymous';
    const storageKey = `demo_fb_votes_${userId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      const voteMap: Record<string, 'up' | 'down'> = stored ? JSON.parse(stored) : {};
      return voteMap[id] || null;
    } catch {
      return null;
    }
  };

  // Vote mutation (with local/offline fallback)
  const voteMutation = useMutation({
    mutationFn: async ({ id, voteType }: { id: string; voteType: 'up' | 'down' }) => {
      // Handle local/sample feedback entirely on the client so voting works even when
      // the backend or Firestore is unavailable.
      if (id.startsWith('demo_fb_') || id.startsWith('local_fb_') || id.startsWith('temp_fb_')) {
        const userId = user?.id || 'anonymous';
        const storageKey = `demo_fb_votes_${userId}`;
        const stored = localStorage.getItem(storageKey);
        const voteMap: Record<string, 'up' | 'down' | undefined> = stored ? JSON.parse(stored) : {};

        const previousVote = voteMap[id]; // 'up', 'down', or undefined

        return await new Promise<{ upvotes: number; downvotes: number }>((resolve) => {
          setLocalFeedback((prev) => {
            const updated = prev.map((fb) => {
              if (fb.id !== id) return fb;

              let { upvotes, downvotes } = fb;

              // Remove previous vote
              if (previousVote === 'up') upvotes = Math.max(0, upvotes - 1);
              if (previousVote === 'down') downvotes = Math.max(0, downvotes - 1);

              // Apply new vote (toggle if same type → no new vote)
              let newVote: 'up' | 'down' | undefined = previousVote;
              if (voteType === previousVote) {
                newVote = undefined;
              } else {
                newVote = voteType;
                if (voteType === 'up') upvotes += 1;
                if (voteType === 'down') downvotes += 1;
              }

              // Persist per-user vote
              if (newVote) {
                voteMap[id] = newVote;
              } else {
                delete voteMap[id];
              }
              localStorage.setItem(storageKey, JSON.stringify(voteMap));

              const result = { upvotes, downvotes };
              resolve(result);
              return { ...fb, upvotes, downvotes };
            });

            localStorage.setItem('demo_feedback', JSON.stringify(updated));
            return updated;
          });
        });
      }

      const response = await apiService.feedback.vote(id, voteType);
      return response.data.data as { upvotes: number; downvotes: number };
    },
    onSuccess: (result, variables) => {
      const isDemo =
        variables.id.startsWith('demo_fb_') ||
        variables.id.startsWith('local_fb_') ||
        variables.id.startsWith('temp_fb_');

      // For real feedback items, optimistically update localFeedback so UI reacts immediately.
      if (!isDemo) {
        setLocalFeedback((prev) => {
          const updated = prev.map((fb) =>
            fb.id === variables.id
              ? { ...fb, upvotes: result.upvotes, downvotes: result.downvotes }
              : fb,
          );
          localStorage.setItem('demo_feedback', JSON.stringify(updated));
          return updated;
        });

        // Only refetch from server for real items, so local votes don't cause a
        // loading flash / page "refresh" feeling.
        queryClient.invalidateQueries({ queryKey: ['feedback'] });
      }
    },
    onError: (error: any, variables) => {
      const isDemo =
        variables.id.startsWith('demo_fb_') ||
        variables.id.startsWith('local_fb_') ||
        variables.id.startsWith('temp_fb_');

      // If the server vote fails for real items, fall back to local update so
      // the user still sees their vote applied.
      if (!isDemo) {
        setLocalFeedback((prev) =>
          prev.map((fb) => {
            if (fb.id !== variables.id) return fb;
            if (variables.voteType === 'up') {
              return { ...fb, upvotes: fb.upvotes + 1 };
            }
            return { ...fb, downvotes: fb.downvotes + 1 };
          }),
        );
      }

      toast.error(error.response?.data?.error || 'Vote saved locally (server unavailable).');
    },
  });

  // Update status mutation (admin only)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AnonymousFeedback['status'] }) => {
      const response = await apiService.feedback.updateStatus(id, status);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast.success('Status updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    },
  });

  // Delete mutation (admin only)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiService.feedback.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast.success('Feedback deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete feedback');
    },
  });

  // Add dummy feedback mutation
  const addDummyFeedbackMutation = useMutation({
    mutationFn: async () => {
      const dummyFeedback = [
        {
          type: 'feedback' as AnonymousFeedback['type'],
          title: 'Great Library Facilities',
          content: 'I wanted to express my appreciation for the library facilities. The quiet study areas and the availability of resources have been really helpful for my studies. Keep up the great work!',
          category: 'facilities',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'complaint' as AnonymousFeedback['type'],
          title: 'Cafeteria Food Quality',
          content: 'The food quality in the cafeteria has been declining recently. Many students have noticed that the meals are often cold and the variety has decreased. Could you please look into this?',
          category: 'food',
          priority: 'high' as AnonymousFeedback['priority'],
        },
        {
          type: 'feedback' as AnonymousFeedback['type'],
          title: 'Event Organization Appreciation',
          content: 'The recent hackathon event was amazing! Great organization, good food, and excellent prizes. Thank you to everyone who made it possible. Looking forward to more events like this!',
          category: 'events',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'complaint' as AnonymousFeedback['type'],
          title: 'WiFi Connectivity Issues',
          content: 'The WiFi in Building B has been very unstable for the past week. It keeps disconnecting during online classes and exams. This is affecting our learning experience. Please fix this urgently.',
          category: 'facilities',
          priority: 'high' as AnonymousFeedback['priority'],
        },
        {
          type: 'feedback' as AnonymousFeedback['type'],
          title: 'Professor Appreciation',
          content: 'I wanted to thank Professor Smith for being so understanding and helpful during office hours. Their teaching style really helps me understand the material better.',
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'complaint' as AnonymousFeedback['type'],
          title: 'Parking Space Issues',
          content: 'There are never enough parking spaces, especially during peak hours. I often have to park far away and walk a long distance. Could we have more parking spaces or a better system?',
          category: 'facilities',
          priority: 'medium' as AnonymousFeedback['priority'],
        },
        {
          type: 'feedback' as AnonymousFeedback['type'],
          title: 'Study Group Success',
          content: 'I found an amazing study group through the campus chat and we\'ve been helping each other prepare for exams. The community here is really supportive!',
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'complaint' as AnonymousFeedback['type'],
          title: 'Noisy Study Areas',
          content: 'The study areas in the library are getting too noisy. People are talking loudly and it\'s hard to concentrate. Could we have stricter quiet zones?',
          category: 'facilities',
          priority: 'medium' as AnonymousFeedback['priority'],
        },
        {
          type: 'feedback' as AnonymousFeedback['type'],
          title: 'Campus Events Feedback',
          content: 'The campus events have been great this semester! Really appreciate the variety and the effort put into organizing them.',
          category: 'events',
          priority: 'low' as AnonymousFeedback['priority'],
        },
      ];

      // Create all dummy feedback
      const promises = dummyFeedback.map((item) =>
        apiService.feedback.create(item).catch((err) => {
          console.warn('Failed to create dummy feedback:', err);
          return null;
        })
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast.success('Dummy feedback added successfully!', { duration: 3000 });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add dummy feedback');
    },
  });

  const resetForm = () => {
    setFormData({
      type: 'feedback',
      title: '',
      content: '',
      category: 'general',
      priority: 'medium',
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleVote = (id: string, voteType: 'up' | 'down') => {
    voteMutation.mutate({ id, voteType });
  };

  const handleStatusUpdate = (id: string, status: AnonymousFeedback['status']) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      deleteMutation.mutate(id);
    }
  };

  const getTypeColor = (type: AnonymousFeedback['type']) => {
    switch (type) {
      case 'feedback':
        return 'bg-green-100 text-green-800';
      case 'complaint':
        return 'bg-red-100 text-red-800';
      case 'confession':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: AnonymousFeedback['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: AnonymousFeedback['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback & Complaints</h1>
          <p className="text-gray-600">Share anonymous feedback or complaints</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => addDummyFeedbackMutation.mutate()}
            disabled={addDummyFeedbackMutation.isPending}
            loading={addDummyFeedbackMutation.isPending}
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Add Sample Data
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Submit Feedback
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
                  placeholder="Search feedback..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                {FEEDBACK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              {isAdmin && (
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
              )}
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
              {(typeFilter || statusFilter || categoryFilter) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTypeFilter('');
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

      {/* Feedback List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading feedback...</p>
        </div>
      ) : filteredFeedback.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 text-lg">No feedback found</p>
            <p className="text-gray-400 mt-2">
              {searchQuery || typeFilter || statusFilter || categoryFilter
                ? 'No feedback matches your filters. Try adjusting them.'
                : 'Be the first to share your feedback!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.filter(f => f.type !== 'confession').map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                      {isAdmin && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="px-2 py-1 bg-gray-100 rounded">{item.category}</span>
                      <span>• {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      {item.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(item.id, 'resolved')}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="prose max-w-none mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleVote(item.id, 'up')}
                      className={`flex items-center gap-2 transition-colors ${
                        getUserVoteForFeedback(item.id) === 'up'
                          ? 'text-green-600'
                          : 'text-gray-600 hover:text-green-600'
                      }`}
                      disabled={voteMutation.isPending}
                    >
                      <HandThumbUpIcon
                        className={`h-5 w-5 ${
                          getUserVoteForFeedback(item.id) === 'up' ? 'fill-green-600 text-green-600' : ''
                        }`}
                      />
                      <span>{item.upvotes}</span>
                    </button>
                    <button
                      onClick={() => handleVote(item.id, 'down')}
                      className={`flex items-center gap-2 transition-colors ${
                        getUserVoteForFeedback(item.id) === 'down'
                          ? 'text-red-600'
                          : 'text-gray-600 hover:text-red-600'
                      }`}
                      disabled={voteMutation.isPending}
                    >
                      <HandThumbDownIcon
                        className={`h-5 w-5 ${
                          getUserVoteForFeedback(item.id) === 'down' ? 'fill-red-600 text-red-600' : ''
                        }`}
                      />
                      <span>{item.downvotes}</span>
                    </button>
                  </div>
                  {isAdmin && item.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(item.id, 'reviewed')}
                      disabled={updateStatusMutation.isPending}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Mark Reviewed
                    </Button>
                  )}
                </div>
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
        title="Submit Feedback or Complaint"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as AnonymousFeedback['type'] })}
              required
              className="input"
            >
              {FEEDBACK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Note: For confessions, please use the separate Confessions page
            </p>
          </div>
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Brief title for your feedback"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={6}
              className="input"
              placeholder="Share your feedback or complaint..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="input"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as AnonymousFeedback['priority'] })}
                required
                className="input"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
            <strong>Note:</strong> All feedback is submitted anonymously. Your identity will not be revealed.
          </div>
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
              Submit Feedback
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FeedbackPage;
