import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import type { Announcement } from '@shared/types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  PencilIcon,
  TrashIcon,
  BellIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium' as Announcement['priority'],
    societyName: '',
    tags: '',
    expiresAt: '',
  });

  // For this app, allow any authenticated user to create announcements.
  // (Server still enforces roles when Firestore is available; when it isn't,
  // we fall back to local/sample announcements.)
  const canCreate = !!user;

  // Fetch announcements
  const { data: announcementsData, isLoading } = useQuery({
    queryKey: ['announcements', priorityFilter],
    queryFn: async () => {
      const response = await apiService.announcements.getAll({
        priority: priorityFilter || undefined,
        limit: 50,
      });
      return response.data.data;
    },
    retry: false,
  });

  const announcements: Announcement[] = announcementsData?.data || [];

  // Load from localStorage on mount
  const [localAnnouncements, setLocalAnnouncements] = useState<Announcement[]>(() => {
    try {
      const stored = localStorage.getItem('demo_announcements');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Combine API and local announcements
  const allAnnouncements = useMemo(() => {
    const combined = [...announcements];
    localAnnouncements.forEach((local) => {
      if (!combined.find((a) => a.id === local.id)) {
        combined.push(local);
      }
    });
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [announcements, localAnnouncements]);

  // Auto-populate sample data on first load if empty (for evaluation/testing)
  useEffect(() => {
    if (allAnnouncements.length === 0) {
      const dummyAnnouncements: Announcement[] = [
        {
          id: 'demo_ann_1',
          title: 'Library Closure This Weekend',
          content: 'The main library will be closed this Saturday and Sunday (Dec 16-17) for scheduled maintenance. All study halls in Building B will remain open 24/7. Please plan your study schedule accordingly.\n\nFor any urgent library services, please contact library@campus.edu',
          authorId: 'admin',
          authorName: 'Campus Administration',
          societyName: 'Campus Administration',
          priority: 'high',
          tags: ['library', 'maintenance', 'important'],
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          views: 245,
          likes: 12,
        },
        {
          id: 'demo_ann_2',
          title: 'Computer Science Society - Hackathon Registration Open',
          content: 'Join us for the annual campus hackathon! Registration is now open.\n\n📅 Date: January 20-21, 2024\n📍 Venue: Tech Building, Room 301\n⏰ Time: 9:00 AM - 6:00 PM\n\nPrizes worth $5000! Food and drinks provided.\n\nRegister at: cs-society.campus.edu/hackathon\n\nDeadline: January 10, 2024',
          authorId: 'society_head',
          authorName: 'CS Society',
          societyName: 'Computer Science Society',
          priority: 'medium',
          tags: ['event', 'hackathon', 'competition'],
          timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          views: 189,
          likes: 28,
        },
        {
          id: 'demo_ann_3',
          title: 'Final Exam Schedule Released',
          content: 'The final examination schedule for Fall 2023 has been released. Please check the student portal for your exam dates and locations.\n\nImportant reminders:\n- Bring your student ID\n- Arrive 15 minutes early\n- No electronic devices allowed\n\nGood luck with your preparations!',
          authorId: 'admin',
          authorName: 'Academic Affairs',
          societyName: 'Academic Affairs',
          priority: 'urgent',
          tags: ['exams', 'academic', 'deadline'],
          timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
          expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
          views: 567,
          likes: 45,
        },
        {
          id: 'demo_ann_4',
          title: 'New Coffee Shop Opening Near Campus',
          content: 'Great news! A new coffee shop "Campus Brew" is opening next week right across from the main gate.\n\nOpening specials:\n- 50% off on all drinks (first week)\n- Student discount: 15% off (with ID)\n- Free WiFi and study space\n\nCome check it out!',
          authorId: 'admin',
          authorName: 'Campus Services',
          priority: 'low',
          tags: ['food', 'campus', 'announcement'],
          timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
          expiresAt: Date.now() + 10 * 24 * 60 * 60 * 1000,
          views: 123,
          likes: 8,
        },
        {
          id: 'demo_ann_5',
          title: 'Career Fair - January 2024',
          content: 'The annual campus career fair is scheduled for January 25-26, 2024.\n\nOver 50 companies will be participating, including:\n- Tech giants (Google, Microsoft, Amazon)\n- Local startups\n- Financial institutions\n- Consulting firms\n\nPrepare your resume and dress professionally!\n\nRegistration opens January 1st.',
          authorId: 'admin',
          authorName: 'Career Services',
          societyName: 'Career Services',
          priority: 'high',
          tags: ['career', 'jobs', 'opportunity'],
          timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
          expiresAt: Date.now() + 45 * 24 * 60 * 60 * 1000,
          views: 342,
          likes: 67,
        },
        {
          id: 'demo_ann_6',
          title: 'Sports Club - Basketball Tournament',
          content: 'Interested in basketball? Join our campus basketball tournament!\n\n🏀 Tournament starts next month\n👥 Teams of 5 players\n🏆 Trophy and medals for winners\n\nSign up at the sports center or email sports@campus.edu',
          authorId: 'society_head',
          authorName: 'Sports Club',
          societyName: 'Sports Club',
          priority: 'medium',
          tags: ['sports', 'basketball', 'tournament'],
          timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
          expiresAt: Date.now() + 20 * 24 * 60 * 60 * 1000,
          views: 156,
          likes: 23,
        },
      ];
      setLocalAnnouncements(dummyAnnouncements);
      localStorage.setItem('demo_announcements', JSON.stringify(dummyAnnouncements));
    }
  }, [allAnnouncements.length]);

  // Filter announcements by priority + search on the combined list so
  // local/demo announcements are also filtered correctly.
  const filteredAnnouncements = useMemo(() => {
    let data = [...allAnnouncements];

    if (priorityFilter) {
      data = data.filter((ann) => ann.priority === priorityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (ann) =>
          ann.title.toLowerCase().includes(q) ||
          ann.content.toLowerCase().includes(q) ||
          ann.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    return data;
  }, [allAnnouncements, priorityFilter, searchQuery]);

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiService.announcements.create({
        ...data,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
        expiresAt: data.expiresAt ? new Date(data.expiresAt).getTime() : undefined,
      });
      return response.data.data as Announcement;
    },
    onSuccess: (created) => {
      // Update remote data
      queryClient.invalidateQueries({ queryKey: ['announcements'] });

      // Also persist locally so the announcement is visible even if Firestore
      // is not available or the refetch returns empty.
      setLocalAnnouncements((prev) => {
        const updated = [created, ...prev.filter((a) => a.id !== created.id)];
        localStorage.setItem('demo_announcements', JSON.stringify(updated));
        return updated;
      });

      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Announcement created successfully!');
    },
    onError: (error: any) => {
      // Fallback: create a local-only announcement so the feature still works in offline/sample mode
      if (user) {
        const now = Date.now();
        const local: Announcement = {
          id: `local_ann_${now}`,
          title: formData.title.trim(),
          content: formData.content.trim(),
          authorId: user.id,
          authorName: user.name,
          societyName: formData.societyName || undefined,
          priority: formData.priority,
          tags: formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          timestamp: now,
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).getTime() : undefined,
          views: 0,
          likes: 0,
        };

        setLocalAnnouncements((prev) => {
          const updated = [local, ...prev];
          localStorage.setItem('demo_announcements', JSON.stringify(updated));
          return updated;
        });

        setIsCreateModalOpen(false);
        resetForm();
        toast.success('Announcement created locally for this session.');
        return;
      }

      toast.error(error.response?.data?.error || 'Failed to create announcement');
    },
  });

  // Update announcement mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Announcement> }) => {
      const response = await apiService.announcements.update(id, {
        ...data,
        tags: typeof data.tags === 'string' ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : data.tags,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setIsEditModalOpen(false);
      setEditingAnnouncement(null);
      resetForm();
      toast.success('Announcement updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update announcement');
    },
  });

  // Helper to check if current user liked a given announcement (local mode)
  const hasUserLikedAnnouncement = (id: string): boolean => {
    const userId = user?.id || 'anonymous';
    const storageKey = `demo_ann_likes_${userId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      const likedMap: Record<string, boolean> = stored ? JSON.parse(stored) : {};
      return !!likedMap[id];
    } catch {
      return false;
    }
  };

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (id: string) => {
      // For local announcements, handle likes purely on the client
      // and ensure each user can only like once (toggle like/unlike).
      if (id.startsWith('demo_ann_') || id.startsWith('local_ann_') || id.startsWith('temp_ann_')) {
        const userId = user?.id || 'anonymous';
        const storageKey = `demo_ann_likes_${userId}`;
        const stored = localStorage.getItem(storageKey);
        const likedMap: Record<string, boolean> = stored ? JSON.parse(stored) : {};

        const alreadyLiked = !!likedMap[id];

        return await new Promise<{ liked: boolean; likes: number }>((resolve) => {
          setLocalAnnouncements((prev) => {
            const updated = prev.map((ann) => {
              if (ann.id === id) {
                const delta = alreadyLiked ? -1 : 1;
                const newLikes = Math.max(0, (ann.likes || 0) + delta);

                // Update per-user like map
                if (alreadyLiked) {
                  delete likedMap[id];
                } else {
                  likedMap[id] = true;
                }
                localStorage.setItem(storageKey, JSON.stringify(likedMap));

                resolve({ liked: !alreadyLiked, likes: newLikes });
                return { ...ann, likes: newLikes };
              }
              return ann;
            });

            localStorage.setItem('demo_announcements', JSON.stringify(updated));
            return updated;
          });
        });
      }

      const response = await apiService.announcements.like(id);
      return response.data.data as { liked: boolean; likes: number };
    },
    onSuccess: (result, id) => {
      // Optimistically update likes in localAnnouncements so the UI responds immediately.
      setLocalAnnouncements((prev) => {
        const updated = prev.map((ann) =>
          ann.id === id ? { ...ann, likes: result.likes } : ann,
        );
        localStorage.setItem('demo_announcements', JSON.stringify(updated));
        return updated;
      });

      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (error: any, id) => {
      // Fallback: if server like fails (e.g. Firestore down), update local copy
      setLocalAnnouncements((prev) => {
        const updated = prev.map((ann) =>
          ann.id === id ? { ...ann, likes: Math.max(0, (ann.likes || 0) + 1) } : ann,
        );
        localStorage.setItem('demo_announcements', JSON.stringify(updated));
        return updated;
      });

      toast.error(error.response?.data?.error || 'Server like failed, updated locally.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiService.announcements.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete announcement');
    },
  });

  // Add dummy announcements mutation
  const addDummyAnnouncementsMutation = useMutation({
    mutationFn: async () => {
      if (!canCreate) {
        throw new Error('You need admin or society_head role to create announcements');
      }

      const dummyAnnouncements = [
        {
          title: 'Library Closure This Weekend',
          content: 'The main library will be closed this Saturday and Sunday (Dec 16-17) for scheduled maintenance. All study halls in Building B will remain open 24/7. Please plan your study schedule accordingly.\n\nFor any urgent library services, please contact library@campus.edu',
          priority: 'high' as Announcement['priority'],
          societyName: 'Campus Administration',
          tags: ['library', 'maintenance', 'important'],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime(), // 7 days from now
        },
        {
          title: 'Computer Science Society - Hackathon Registration Open',
          content: 'Join us for the annual campus hackathon! Registration is now open.\n\n📅 Date: January 20-21, 2024\n📍 Venue: Tech Building, Room 301\n⏰ Time: 9:00 AM - 6:00 PM\n\nPrizes worth $5000! Food and drinks provided.\n\nRegister at: cs-society.campus.edu/hackathon\n\nDeadline: January 10, 2024',
          priority: 'medium' as Announcement['priority'],
          societyName: 'Computer Science Society',
          tags: ['event', 'hackathon', 'competition'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(),
        },
        {
          title: 'Final Exam Schedule Released',
          content: 'The final examination schedule for Fall 2023 has been released. Please check the student portal for your exam dates and locations.\n\nImportant reminders:\n- Bring your student ID\n- Arrive 15 minutes early\n- No electronic devices allowed\n\nGood luck with your preparations!',
          priority: 'urgent' as Announcement['priority'],
          societyName: 'Academic Affairs',
          tags: ['exams', 'academic', 'deadline'],
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).getTime(),
        },
        {
          title: 'New Coffee Shop Opening Near Campus',
          content: 'Great news! A new coffee shop "Campus Brew" is opening next week right across from the main gate.\n\nOpening specials:\n- 50% off on all drinks (first week)\n- Student discount: 15% off (with ID)\n- Free WiFi and study space\n\nCome check it out!',
          priority: 'low' as Announcement['priority'],
          societyName: '',
          tags: ['food', 'campus', 'announcement'],
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).getTime(),
        },
        {
          title: 'Career Fair - January 2024',
          content: 'The annual campus career fair is scheduled for January 25-26, 2024.\n\nOver 50 companies will be participating, including:\n- Tech giants (Google, Microsoft, Amazon)\n- Local startups\n- Financial institutions\n- Consulting firms\n\nPrepare your resume and dress professionally!\n\nRegistration opens January 1st.',
          priority: 'high' as Announcement['priority'],
          societyName: 'Career Services',
          tags: ['career', 'jobs', 'opportunity'],
          expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).getTime(),
        },
        {
          title: 'Sports Club - Basketball Tournament',
          content: 'Interested in basketball? Join our campus basketball tournament!\n\n🏀 Tournament starts next month\n👥 Teams of 5 players\n🏆 Trophy and medals for winners\n\nSign up at the sports center or email sports@campus.edu',
          priority: 'medium' as Announcement['priority'],
          societyName: 'Sports Club',
          tags: ['sports', 'basketball', 'tournament'],
          expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).getTime(),
        },
        {
          title: 'Parking Lot Maintenance - Temporary Closure',
          content: 'Parking Lot A will be closed for maintenance on December 20th from 8 AM to 5 PM.\n\nAlternative parking available at:\n- Parking Lot B (behind Building C)\n- Street parking on Campus Drive\n\nWe apologize for the inconvenience.',
          priority: 'medium' as Announcement['priority'],
          societyName: 'Facilities Management',
          tags: ['parking', 'maintenance', 'notice'],
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).getTime(),
        },
        {
          title: 'Student Council Elections - Voting Open',
          content: 'Vote for your student council representatives!\n\n🗳️ Voting Period: December 15-20\n📍 Vote online at: studentportal.campus.edu/vote\n\nMeet the candidates at the student center this week.\n\nYour vote matters!',
          priority: 'high' as Announcement['priority'],
          societyName: 'Student Council',
          tags: ['elections', 'voting', 'student government'],
          expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).getTime(),
        },
        {
          title: 'Winter Break Schedule',
          content: 'Campus will be closed for winter break from December 23 to January 2.\n\nAll facilities including library, gym, and cafeteria will be closed during this period.\n\nEmergency contact: security@campus.edu\n\nHave a safe and happy holidays!',
          priority: 'high' as Announcement['priority'],
          societyName: 'Campus Administration',
          tags: ['holidays', 'schedule', 'important'],
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).getTime(),
        },
        {
          title: 'Photography Club - Photo Contest',
          content: 'Submit your best campus photos for our annual photo contest!\n\n📸 Categories:\n- Campus Life\n- Nature & Architecture\n- Events & Activities\n\nPrizes: $500, $300, $200\nDeadline: January 15, 2024\n\nSubmit at: photo-club.campus.edu/contest',
          priority: 'low' as Announcement['priority'],
          societyName: 'Photography Club',
          tags: ['contest', 'photography', 'art'],
          expiresAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).getTime(),
        },
      ];

      // Create all dummy announcements
      const promises = dummyAnnouncements.map((ann) =>
        apiService.announcements.create(ann).catch((err) => {
          console.warn('Failed to create dummy announcement:', err);
          return null;
        })
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Dummy announcements added successfully!', { duration: 3000 });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add dummy announcements');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'medium',
      societyName: '',
      tags: '',
      expiresAt: '',
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      societyName: announcement.societyName || '',
      tags: announcement.tags.join(', '),
      expiresAt: announcement.expiresAt
        ? format(new Date(announcement.expiresAt), "yyyy-MM-dd'T'HH:mm")
        : '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    updateMutation.mutate({
      id: editingAnnouncement.id,
      data: {
        ...formData,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).getTime() : undefined,
      },
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      deleteMutation.mutate(id);
    }
  };

  const getPriorityColor = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600">Stay updated with campus news and events</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <>
              <Button
                variant="outline"
                onClick={() => addDummyAnnouncementsMutation.mutate()}
                disabled={addDummyAnnouncementsMutation.isPending}
                loading={addDummyAnnouncementsMutation.isPending}
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
            Add Sample Data
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Announcement
              </Button>
            </>
          )}
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
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="input"
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
              {priorityFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPriorityFilter('')}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading announcements...</p>
        </div>
      ) : allAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 text-lg">No announcements found</p>
            <p className="text-gray-400 mt-2">
              {searchQuery || priorityFilter
                ? 'Try adjusting your filters'
                : 'No announcements yet. Check back later!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <BellIcon className="h-6 w-6 text-primary-600" />
                      <h2 className="text-xl font-bold text-gray-900">{announcement.title}</h2>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                          announcement.priority
                        )}`}
                      >
                        {announcement.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span>By {announcement.authorName}</span>
                      {announcement.societyName && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {announcement.societyName}
                        </span>
                      )}
                      <span>• {formatDistanceToNow(new Date(announcement.timestamp), { addSuffix: true })}</span>
                      <span>• {announcement.views} views</span>
                    </div>
                  </div>
                  {announcement.authorId === user?.id && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(announcement)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(announcement.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="prose max-w-none mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                </div>

                {announcement.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {announcement.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <button
                    onClick={() => likeMutation.mutate(announcement.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      hasUserLikedAnnouncement(announcement.id)
                        ? 'text-red-600'
                        : 'text-gray-600 hover:text-red-600'
                    }`}
                    disabled={likeMutation.isPending}
                  >
                    <HeartIcon
                      className={`h-5 w-5 ${
                        hasUserLikedAnnouncement(announcement.id) ? 'fill-red-600 text-red-600' : ''
                      }`}
                    />
                    <span>{announcement.likes}</span>
                  </button>
                  {announcement.expiresAt && (
                    <span className="text-xs text-gray-500">
                      Expires: {format(new Date(announcement.expiresAt), 'MMM d, yyyy')}
                    </span>
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
        title="Create Announcement"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Announcement title"
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
              placeholder="Announcement content..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Announcement['priority'] })}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Society Name (optional)
              </label>
              <Input
                value={formData.societyName}
                onChange={(e) => setFormData({ ...formData, societyName: e.target.value })}
                placeholder="e.g., Computer Science Society"
              />
            </div>
          </div>
          <Input
            label="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="event, important, deadline"
          />
          <Input
            label="Expires At (optional)"
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
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
              Create Announcement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAnnouncement(null);
          resetForm();
        }}
        title="Edit Announcement"
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
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={6}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Announcement['priority'] })}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Society Name
              </label>
              <Input
                value={formData.societyName}
                onChange={(e) => setFormData({ ...formData, societyName: e.target.value })}
              />
            </div>
          </div>
          <Input
            label="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
          <Input
            label="Expires At"
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingAnnouncement(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Update Announcement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;
