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
  HeartIcon,
} from '@heroicons/react/24/outline';

const CATEGORIES = ['general', 'academic', 'facilities', 'food', 'events', 'other'];

const ConfessionsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
  });

  // Fetch confessions only
  const { data: confessionsData, isLoading } = useQuery({
    queryKey: ['confessions', categoryFilter],
    queryFn: async () => {
      const response = await apiService.feedback.getAll({
        type: 'confession',
        category: categoryFilter || undefined,
        limit: 50,
      });
      return response.data.data;
    },
    retry: false,
  });

  const confessions: AnonymousFeedback[] = confessionsData?.data || [];

  // Load from localStorage on mount
  const [localConfessions, setLocalConfessions] = useState<AnonymousFeedback[]>(() => {
    try {
      const stored = localStorage.getItem('demo_confessions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Combine API and local confessions
  const allConfessions = useMemo(() => {
    const combined = [...confessions];
    localConfessions.forEach(local => {
      if (!combined.find(c => c.id === local.id)) {
        combined.push(local);
      }
    });
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [confessions, localConfessions]);

  // Filter by search query
  const filteredConfessions = searchQuery
    ? allConfessions.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allConfessions;

  // Auto-populate dummy data on first load if empty (for evaluation/demo)
  useEffect(() => {
    if (allConfessions.length === 0) {
      const dummyConfessions: AnonymousFeedback[] = [
        {
          id: 'demo_conf_1',
          type: 'confession',
          title: 'Study Struggles',
          content: 'I\'ve been struggling with my studies lately and feeling overwhelmed. It\'s hard to keep up with all the assignments and exams. Just needed to get this off my chest.',
          category: 'academic',
          priority: 'low',
          status: 'pending',
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
          upvotes: 23,
          downvotes: 1,
        },
        {
          id: 'demo_conf_2',
          title: 'Feeling Homesick',
          content: 'I\'ve been feeling really homesick lately. It\'s my first semester away from home and I\'m finding it harder than I expected. Just wanted to share this anonymously.',
          type: 'confession',
          category: 'general',
          priority: 'low',
          status: 'pending',
          timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
          upvotes: 18,
          downvotes: 0,
        },
        {
          id: 'demo_conf_3',
          type: 'confession',
          title: 'Imposter Syndrome',
          content: 'Sometimes I feel like I don\'t belong here and everyone else is smarter than me. I know it\'s probably just in my head, but it\'s hard to shake this feeling.',
          category: 'academic',
          priority: 'low',
          status: 'pending',
          timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
          upvotes: 31,
          downvotes: 2,
        },
        {
          id: 'demo_conf_4',
          type: 'confession',
          title: 'Social Anxiety',
          content: 'I find it really hard to make friends. Everyone seems to have their groups already and I feel like I\'m always on the outside. Wish I was better at socializing.',
          category: 'general',
          priority: 'low',
          status: 'pending',
          timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
          upvotes: 27,
          downvotes: 1,
        },
        {
          id: 'demo_conf_5',
          type: 'confession',
          title: 'Procrastination Problem',
          content: 'I keep procrastinating on my assignments and then stress about them at the last minute. I know I should start earlier but I can\'t seem to break this cycle.',
          category: 'academic',
          priority: 'low',
          status: 'pending',
          timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
          upvotes: 45,
          downvotes: 3,
        },
        {
          id: 'demo_conf_6',
          type: 'confession',
          title: 'Feeling Proud',
          content: 'I finally got an A on my midterm after failing the first one. I worked so hard and I\'m really proud of myself. Just wanted to share this win!',
          category: 'academic',
          priority: 'low',
          status: 'pending',
          timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000,
          upvotes: 52,
          downvotes: 0,
        },
      ];
      setLocalConfessions(dummyConfessions);
      localStorage.setItem('demo_confessions', JSON.stringify(dummyConfessions));
    }
  }, [allConfessions.length]);

  // Create confession mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiService.feedback.create({
        ...data,
        type: 'confession',
        priority: 'low', // Confessions don't need priority
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confessions'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Confession submitted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit confession');
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ id, voteType }: { id: string; voteType: 'up' | 'down' }) => {
      const response = await apiService.feedback.vote(id, voteType);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confessions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to vote');
    },
  });

  // Add dummy confessions mutation
  const addDummyConfessionsMutation = useMutation({
    mutationFn: async () => {
      const dummyConfessions = [
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Study Struggles',
          content: 'I\'ve been struggling with my studies lately and feeling overwhelmed. It\'s hard to keep up with all the assignments and exams. Just needed to get this off my chest.',
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Feeling Homesick',
          content: 'I\'ve been feeling really homesick lately. It\'s my first semester away from home and I\'m finding it harder than I expected. Just wanted to share this anonymously.',
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Imposter Syndrome',
          content: 'Sometimes I feel like I don\'t belong here and everyone else is smarter than me. I know it\'s probably just in my head, but it\'s hard to shake this feeling.',
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Social Anxiety',
          content: 'I find it really hard to make friends. Everyone seems to have their groups already and I feel like I\'m always on the outside. Wish I was better at socializing.',
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Procrastination Problem',
          content: 'I keep procrastinating on my assignments and then stress about them at the last minute. I know I should start earlier but I can\'t seem to break this cycle.',
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Missing Home Cooking',
          content: 'I really miss my mom\'s cooking. The cafeteria food just doesn\'t compare. Sometimes I just want a home-cooked meal.',
          category: 'food',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Feeling Proud',
          content: 'I finally got an A on my midterm after failing the first one. I worked so hard and I\'m really proud of myself. Just wanted to share this win!',
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Late Night Thoughts',
          content: 'I stay up way too late studying and then regret it the next morning. But I can\'t seem to manage my time better. Anyone else struggle with this?',
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Grateful for Friends',
          content: 'I\'m so grateful for the friends I\'ve made here. They\'ve been so supportive during tough times. This campus community is amazing.',
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'First Love',
          content: 'I think I\'m falling for someone in my class but I\'m too shy to say anything. Maybe one day I\'ll have the courage.',
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
      ];

      // Create all dummy confessions
      const promises = dummyConfessions.map((item) =>
        apiService.feedback.create(item).catch((err) => {
          console.warn('Failed to create dummy confession:', err);
          return null;
        })
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confessions'] });
      toast.success('Dummy confessions added successfully!', { duration: 3000 });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add dummy confessions');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleVote = (id: string, voteType: 'up' | 'down') => {
    voteMutation.mutate({ id, voteType });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Confessions</h1>
          <p className="text-gray-600">Share your thoughts anonymously - completely private and safe</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => addDummyConfessionsMutation.mutate()}
            disabled={addDummyConfessionsMutation.isPending}
            loading={addDummyConfessionsMutation.isPending}
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Add Demo Data
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Share Confession
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
                  placeholder="Search confessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
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
              {categoryFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryFilter('')}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confessions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading confessions...</p>
        </div>
      ) : allConfessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No confessions yet</p>
            <p className="text-gray-400 mt-2">
              {searchQuery || categoryFilter
                ? 'Try adjusting your filters'
                : 'Be the first to share your thoughts anonymously!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredConfessions.map((confession) => (
            <Card key={confession.id} className="hover:shadow-lg transition-shadow bg-purple-50/50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <HeartIcon className="h-6 w-6 text-purple-600" />
                      <h2 className="text-xl font-bold text-gray-900">{confession.title}</h2>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Confession
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="px-2 py-1 bg-gray-100 rounded">{confession.category}</span>
                      <span>• {formatDistanceToNow(new Date(confession.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                <div className="prose max-w-none mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{confession.content}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-purple-200">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleVote(confession.id, 'up')}
                      className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                      disabled={voteMutation.isPending}
                    >
                      <HandThumbUpIcon className="h-5 w-5" />
                      <span>{confession.upvotes}</span>
                    </button>
                    <button
                      onClick={() => handleVote(confession.id, 'down')}
                      className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
                      disabled={voteMutation.isPending}
                    >
                      <HandThumbDownIcon className="h-5 w-5" />
                      <span>{confession.downvotes}</span>
                    </button>
                  </div>
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
        title="Share Your Confession"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Brief title for your confession"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Confession
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={8}
              className="input"
              placeholder="Share what's on your mind... This is completely anonymous and safe."
            />
          </div>
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
          <div className="bg-purple-50 p-3 rounded-md text-sm text-purple-800">
            <strong>💜 Privacy Promise:</strong> Your confession is completely anonymous. No one will know it's you, not even admins. Share freely and safely.
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
              Share Confession
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ConfessionsPage;

