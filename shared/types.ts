// Shared types and interfaces for CampusBuddy

export interface User {
  id: string;
  name: string;
  email: string;
  batch: string;
  role: 'student' | 'admin' | 'society_head';
  profilePicture?: string;
  joinedAt: number;
  badges: Badge[];
  points: number;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorBatch: string;
  timestamp: number;
  edited?: boolean;
  editedAt?: number;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface ChatSummary {
  id: string;
  summary: string;
  messageCount: number;
  timeRange: {
    start: number;
    end: number;
  };
  generatedAt: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  societyName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  timestamp: number;
  expiresAt?: number;
  attachments?: string[];
  views: number;
  likes: number;
}

export interface LostFoundItem {
  id: string;
  title: string;
  description: string;
  category: 'electronics' | 'clothing' | 'books' | 'accessories' | 'documents' | 'other';
  status: 'lost' | 'found' | 'returned';
  reporterId: string;
  reporterName: string;
  location: string;
  contactInfo: string;
  imageUrl?: string;
  timestamp: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface AnonymousFeedback {
  id: string;
  type: 'feedback' | 'complaint' | 'confession';
  title: string;
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'resolved';
  timestamp: number;
  upvotes: number;
  downvotes: number;
}

export interface MoodEntry {
  id: string;
  userId: string;
  mood: 'stressed' | 'tired' | 'motivated' | 'happy' | 'anxious' | 'focused';
  studyTip: string;
  timestamp: number;
  helpful?: boolean;
}

export interface CampusStatus {
  id: string;
  facility: string;
  status: 'available' | 'busy' | 'closed' | 'maintenance';
  description: string;
  lastUpdated: number;
  updatedBy: string;
  keywords: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'helper' | 'social' | 'academic' | 'special';
  earnedAt: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'message' | 'announcement' | 'lost_found' | 'feedback' | 'mood_entry' | 'status_update';
  description: string;
  points: number;
  timestamp: number;
}

export interface NotificationPreferences {
  announcements: boolean;
  lostFound: boolean;
  chatMentions: boolean;
  moodReminders: boolean;
  badgeEarned: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  batch: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Socket event types
export interface SocketEvents {
  // Chat events
  'message:send': Message;
  'message:receive': Message;
  'message:edit': { messageId: string; content: string };
  'message:delete': { messageId: string };
  'message:reaction': { messageId: string; emoji: string; userId: string };

  // User events
  'user:online': { userId: string };
  'user:offline': { userId: string };
  'user:typing': { userId: string; isTyping: boolean };

  // Announcement events
  'announcement:new': Announcement;

  // Status events
  'status:update': CampusStatus;
}
