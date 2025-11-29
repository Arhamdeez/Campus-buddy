import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { Message, Announcement, CampusStatus, SocketEvents } from '@shared/types';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
  sendMessage: (content: string) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  setTyping: (isTyping: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('campusbuddy_token');
      if (!token) return;

      // Initialize socket connection
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: {
          token,
        },
        transports: ['websocket'],
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // User presence handlers
      newSocket.on('user:online', (data: { userId: string }) => {
        setOnlineUsers(prev => new Set(prev).add(data.userId));
      });

      newSocket.on('user:offline', (data: { userId: string }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      // Typing indicators
      newSocket.on('user:typing', (data: { userId: string; isTyping: boolean }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });

        // Clear typing indicator after 3 seconds
        if (data.isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userId);
              return newSet;
            });
          }, 3000);
        }
      });

      // Message handlers
      newSocket.on('message:receive', (message: Message) => {
        // This will be handled by the chat page component
        // We can dispatch custom events or use a global state manager
        window.dispatchEvent(new CustomEvent('newMessage', { detail: message }));
      });

      newSocket.on('message:delete', (data: { messageId: string }) => {
        window.dispatchEvent(new CustomEvent('messageDeleted', { detail: data }));
      });

      // Announcement handlers
      newSocket.on('announcement:new', (announcement: Announcement) => {
        toast.success(`New announcement: ${announcement.title}`);
        window.dispatchEvent(new CustomEvent('newAnnouncement', { detail: announcement }));
      });

      // Status update handlers
      newSocket.on('status:update', (status: CampusStatus) => {
        toast.info(`Campus status updated: ${status.facility}`);
        window.dispatchEvent(new CustomEvent('statusUpdate', { detail: status }));
      });

      // Notification handlers
      newSocket.on('notification', (notification: any) => {
        toast(notification.message, {
          icon: notification.icon || '📢',
          duration: 5000,
        });
      });

      // Error handlers
      newSocket.on('error', (error: { message: string }) => {
        toast.error(error.message);
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers(new Set());
        setTypingUsers(new Set());
      };
    } else {
      // User logged out, disconnect socket
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers(new Set());
        setTypingUsers(new Set());
      }
    }
  }, [user]);

  const sendMessage = (content: string) => {
    if (socket && isConnected) {
      socket.emit('message:send', { content });
    }
  };

  const editMessage = (messageId: string, content: string) => {
    if (socket && isConnected) {
      socket.emit('message:edit', { messageId, content });
    }
  };

  const deleteMessage = (messageId: string) => {
    if (socket && isConnected) {
      socket.emit('message:delete', { messageId });
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    if (socket && isConnected) {
      socket.emit('message:reaction', { messageId, emoji });
    }
  };

  const setTyping = (isTyping: boolean) => {
    if (socket && isConnected) {
      socket.emit('user:typing', { isTyping });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    setTyping,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
