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

// Legacy, non-spicy seed titles we want to hide/replace in the UI
const LEGACY_CONFESSION_TITLES = new Set([
  'Feeling Homesick',
  'Study Struggles',
  'Imposter Syndrome',
  'Social Anxiety',
  'Procrastination Problem',
  'Feeling Proud',
  'Missing Home Cooking',
  'Late Night Thoughts',
  'Grateful for Friends',
  'First Love',
]);

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
    localConfessions.forEach((local) => {
      if (!combined.find((c) => c.id === local.id)) {
        combined.push(local);
      }
    });
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [confessions, localConfessions]);

  // Apply category + search filters on the combined list so that
  // local confessions are also filtered correctly.
  const filteredConfessions = useMemo(() => {
    // First remove legacy, non-spicy demo confessions
    let data = allConfessions.filter(
      (item) => !LEGACY_CONFESSION_TITLES.has(item.title),
    );

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
  }, [allConfessions, categoryFilter, searchQuery]);

  // Auto-populate spicy/campus-life sample data if there are no non-legacy confessions
  useEffect(() => {
    const nonLegacy = allConfessions.filter(
      (c) => !LEGACY_CONFESSION_TITLES.has(c.title),
    );

    if (nonLegacy.length === 0) {
      const dummyConfessions: AnonymousFeedback[] = [
        {
          id: 'demo_conf_1',
          type: 'confession',
          title: 'Lecture Hall Crush',
          content:
            "There's this person who always sits two rows ahead of me in the 9 AM lecture. I pretend to be interested in the slides but I'm really just hoping they'll look back and notice me once. I know their coffee order, their backpack color, everything—just not their name.",
          category: 'general',
          priority: 'low',
          status: 'pending',
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
          upvotes: 23,
          downvotes: 1,
        },
        {
          id: 'demo_conf_2',
          title: 'Group Project Feelings',
          content:
            'I said I\'d take the "documentation" part of the group project just so I could sit next to my crush during meetings. The project is almost done and I still haven\'t decided if I\'m more stressed about the grade or about them finding out.',
          type: 'confession',
          category: 'academic',
          priority: 'low',
          status: 'pending',
          timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
          upvotes: 18,
          downvotes: 0,
        },
        {
          id: 'demo_conf_3',
          type: 'confession',
          title: 'Lab Partner Crush',
          content:
            "My lab partner always explains concepts to me so patiently and it low‑key makes my heart melt. I pretend I don't understand things sometimes just so they'll lean over and walk me through it again.",
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
          title: 'Library Encounter',
          content:
            "I bumped into someone in the library doorway, we both dropped our books, apologized, laughed, and then just walked away. I replay that 5‑second interaction in my head like it was a whole K‑drama episode.",
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
          title: 'Accidental Late‑Night Text',
          content:
            "I typed out a whole paragraph about how much I like my crush just to vent, and I accidentally sent it to them instead of my friend. I turned my phone on airplane mode and pretended I fell asleep. We still haven't talked about it.",
          category: 'general',
          priority: 'low',
          status: 'pending',
          timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
          upvotes: 45,
          downvotes: 3,
        },
        {
          id: 'demo_conf_6',
          type: 'confession',
          title: 'Secret Supporter',
          content:
            "There's someone in my class who always looks tired and stressed. I've anonymously left them little sticky‑note compliments and snacks a few times. I don't know if they know it's me, but I hope it makes their day a bit better.",
          category: 'general',
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

  // Helper to get current user's vote for a confession (local mode)
  const getUserVoteForConfession = (id: string): 'up' | 'down' | null => {
    const userId = user?.id || 'anonymous';
    const storageKey = `demo_conf_votes_${userId}`;
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
      // Handle local/sample confessions entirely on the client so voting works even when
      // the backend or Firestore is unavailable.
      if (id.startsWith('demo_conf_') || id.startsWith('local_conf_') || id.startsWith('temp_conf_')) {
        const userId = user?.id || 'anonymous';
        const storageKey = `demo_conf_votes_${userId}`;
        const stored = localStorage.getItem(storageKey);
        const voteMap: Record<string, 'up' | 'down' | undefined> = stored ? JSON.parse(stored) : {};

        const previousVote = voteMap[id]; // 'up', 'down', or undefined

        return await new Promise<{ upvotes: number; downvotes: number }>((resolve) => {
          setLocalConfessions((prev) => {
            const updated = prev.map((conf) => {
              if (conf.id !== id) return conf;

              let { upvotes, downvotes } = conf;

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
              return { ...conf, upvotes, downvotes };
            });

            localStorage.setItem('demo_confessions', JSON.stringify(updated));
            return updated;
          });
        });
      }

      const response = await apiService.feedback.vote(id, voteType);
      return response.data.data as { upvotes: number; downvotes: number };
    },
    onSuccess: (result, variables) => {
      const isDemo =
        variables.id.startsWith('demo_conf_') ||
        variables.id.startsWith('local_conf_') ||
        variables.id.startsWith('temp_conf_');

      // For real confessions, optimistically update localConfessions so UI reacts immediately.
      if (!isDemo) {
        setLocalConfessions((prev) => {
          const updated = prev.map((conf) =>
            conf.id === variables.id
              ? { ...conf, upvotes: result.upvotes, downvotes: result.downvotes }
              : conf,
          );
          localStorage.setItem('demo_confessions', JSON.stringify(updated));
          return updated;
        });

        // Only refetch from server for real items, so local votes don't cause a
        // loading flash / "refresh" feeling.
        queryClient.invalidateQueries({ queryKey: ['confessions'] });
      }
    },
    onError: (error: any, variables) => {
      const isDemo =
        variables.id.startsWith('demo_conf_') ||
        variables.id.startsWith('local_conf_') ||
        variables.id.startsWith('temp_conf_');

      // If the server vote fails for real items, fall back to local update so
      // the user still sees their vote applied.
      if (!isDemo) {
        setLocalConfessions((prev) =>
          prev.map((conf) => {
            if (conf.id !== variables.id) return conf;
            if (variables.voteType === 'up') {
              return { ...conf, upvotes: conf.upvotes + 1 };
            }
            return { ...conf, downvotes: conf.downvotes + 1 };
          }),
        );
      }

      toast.error(error.response?.data?.error || 'Vote saved locally (server unavailable).');
    },
  });

  // Add dummy confessions mutation
  const addDummyConfessionsMutation = useMutation({
    mutationFn: async () => {
      const dummyConfessions = [
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Lecture Hall Crush',
          content:
            "There's this person who always sits two rows ahead of me in the 9 AM lecture. I pretend to be interested in the slides but I'm really just hoping they'll look back and notice me once.",
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Group Project Feelings',
          content:
            "I volunteered for documentation in the group project just so I could sit next to my crush during meetings.",
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Lab Partner Crush',
          content:
            "My lab partner explains concepts so patiently that I pretend not to get things just to keep them talking.",
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Library Encounter',
          content:
            "We bumped into each other at the library entrance, dropped our books, laughed, and walked away. I've been thinking about that five seconds for days.",
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Accidental Late‑Night Text',
          content:
            "I accidentally sent my crush a paragraph confessing my feelings that was meant for my best friend, then put my phone on airplane mode and pretended I was asleep.",
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Secret Supporter',
          content:
            "I've been leaving anonymous sticky‑note compliments and snacks for a stressed‑looking classmate. I don't know if they know it's me.",
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Campus Coffee Crush',
          content:
            "I always time my coffee run to match my crush's usual order time. The barista knows my drink, but not that I'm only there to see one person.",
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Notes in the Margins',
          content:
            "I borrowed a friend's notebook and found a little heart next to my name in the margin. I've been overthinking it ever since.",
          category: 'academic',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Library Window Seat',
          content:
            "There's someone who always takes the same window seat in the library. I schedule my study time just to sit across from them and share silent playlists.",
          category: 'general',
          priority: 'low' as AnonymousFeedback['priority'],
        },
        {
          type: 'confession' as AnonymousFeedback['type'],
          title: 'Crush in My DMs',
          content:
            "My crush replied “this made my day” to a meme I sent and I've been smiling about it for a week straight.",
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
            Add Sample Data
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
      ) : filteredConfessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No confessions yet</p>
            <p className="text-gray-400 mt-2">
              {searchQuery || categoryFilter
                ? 'No confessions match your filters. Try adjusting them.'
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
                      className={`flex items-center gap-2 transition-colors ${
                        getUserVoteForConfession(confession.id) === 'up'
                          ? 'text-green-600'
                          : 'text-gray-600 hover:text-green-600'
                      }`}
                      disabled={voteMutation.isPending}
                    >
                      <HandThumbUpIcon
                        className={`h-5 w-5 ${
                          getUserVoteForConfession(confession.id) === 'up'
                            ? 'fill-green-600 text-green-600'
                            : ''
                        }`}
                      />
                      <span>{confession.upvotes}</span>
                    </button>
                    <button
                      onClick={() => handleVote(confession.id, 'down')}
                      className={`flex items-center gap-2 transition-colors ${
                        getUserVoteForConfession(confession.id) === 'down'
                          ? 'text-red-600'
                          : 'text-gray-600 hover:text-red-600'
                      }`}
                      disabled={voteMutation.isPending}
                    >
                      <HandThumbDownIcon
                        className={`h-5 w-5 ${
                          getUserVoteForConfession(confession.id) === 'down'
                            ? 'fill-red-600 text-red-600'
                            : ''
                        }`}
                      />
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

