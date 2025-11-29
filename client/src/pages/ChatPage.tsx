import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { apiService } from '../services/api';
import type { Message, ChatSummary } from '@shared/types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '🎉', '🔥'];

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { sendMessage, editMessage, deleteMessage, addReaction, setTyping, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<ChatSummary | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch messages
  const { data: messagesData, isLoading, error: messagesError } = useQuery({
    queryKey: ['chat', 'messages'],
    queryFn: async () => {
      try {
        const response = await apiService.chat.getMessages({ limit: 50 });
        return response.data.data;
      } catch (error: any) {
        // Handle connection refused errors gracefully
        if (error.code === 'ERR_CONNECTION_REFUSED' || error.message?.includes('Connection refused')) {
          console.warn('⚠️ Server not ready yet, will retry...');
          throw error; // Let React Query handle retry
        }
        throw error;
      }
    },
    retry: 3, // Retry up to 3 times for connection issues
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    onError: (error: any) => {
      // Don't redirect on error, just show a message
      console.error('Failed to load messages:', error);
      if (error.code === 'ERR_CONNECTION_REFUSED') {
        toast.error('Cannot connect to server. Please make sure the server is running.', {
          duration: 5000,
        });
      } else if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error('Failed to load chat messages. Some features may be limited.');
      }
    },
  });

  const messages: Message[] = messagesData?.data || [];

  // Auto-populate dummy messages on first load if empty (for evaluation/demo)
  useEffect(() => {
    if (!isLoading && messages.length === 0 && !localStorage.getItem('chat_demo_added')) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        addDummyMessages();
        localStorage.setItem('chat_demo_added', 'true');
        toast.success('Demo messages loaded!', { duration: 2000 });
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, messages.length]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiService.chat.sendMessage(content);
      return response.data.data;
    },
    onSuccess: (newMessage) => {
      // Update the query data with the API response
      // This replaces any temp message with the same content from the same author
      if (newMessage) {
        queryClient.setQueryData(['chat', 'messages'], (old: any) => {
          if (!old) {
            return { data: [newMessage], total: 1, page: 1, limit: 50, hasMore: false };
          }
          
          // Check if message already exists (by ID or by matching temp message)
          const existingIndex = old.data.findIndex((msg: Message) => 
            msg.id === newMessage.id || 
            (msg.id.startsWith('temp_') && 
             msg.content === newMessage.content && 
             msg.authorId === newMessage.authorId &&
             Math.abs(msg.timestamp - newMessage.timestamp) < 30000) // Within 30 seconds
          );
          
          let updated: Message[];
          if (existingIndex >= 0) {
            // Replace the existing message (temp or real) with the new one
            updated = [...old.data];
            updated[existingIndex] = newMessage;
          } else {
            // Add as new message
            updated = [...old.data, newMessage];
          }
          
          // Remove any duplicates and sort by timestamp
          const unique = Array.from(
            new Map(updated.map((msg: Message) => [msg.id, msg])).values()
          ).sort((a: Message, b: Message) => a.timestamp - b.timestamp);
          
          // Persist to localStorage
          localStorage.setItem('campusbuddy_chat_messages', JSON.stringify(unique));
          
          return { ...old, data: unique, total: unique.length };
        });
      }
      setMessageInput('');
    },
    onError: (error: any) => {
      // Don't show error if it's just a connection issue - socket message already sent
      if (error.code !== 'ERR_CONNECTION_REFUSED' && !error.message?.includes('Connection refused')) {
        toast.error(error.response?.data?.error || 'Failed to save message to server');
      }
    },
  });

  // Generate summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiService.chat.generateSummary({
        messageCount: 50,
      });
      return response.data.data;
    },
    onSuccess: (summary: ChatSummary) => {
      setCurrentSummary(summary);
      setSummaryModalOpen(true);
      toast.success('Chat summary generated!', {
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to generate summary');
    },
  });

  // Listen for new messages via Socket.IO
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent<Message>) => {
      const newMessage = event.detail;
      
      // Persist to localStorage
      const existingMessages = JSON.parse(localStorage.getItem('campusbuddy_chat_messages') || '[]');
      const updatedMessages = [...existingMessages, newMessage];
      // Remove duplicates and sort
      const uniqueMessages = Array.from(
        new Map(updatedMessages.map(msg => [msg.id, msg])).values()
      ).sort((a, b) => a.timestamp - b.timestamp);
      localStorage.setItem('campusbuddy_chat_messages', JSON.stringify(uniqueMessages));

      queryClient.setQueryData(['chat', 'messages'], (old: any) => {
        if (!old) {
          // If no old data, create new structure
          return { data: [newMessage], total: 1, page: 1, limit: 50, hasMore: false };
        }
        
        // Check if message already exists (by ID or by matching content from same author within 30 seconds)
        const existingIndex = old.data.findIndex((msg: Message) => 
          msg.id === newMessage.id || 
          (msg.content === newMessage.content && 
           msg.authorId === newMessage.authorId &&
           Math.abs(msg.timestamp - newMessage.timestamp) < 30000)
        );
        
        let updated: Message[];
        if (existingIndex >= 0) {
          // Message already exists, update it (replace temp with real ID if needed)
          updated = [...old.data];
          updated[existingIndex] = newMessage; // Use the new message (might have real ID instead of temp)
        } else {
          // Add as new message
          updated = [...old.data, newMessage];
        }
        
        // Sort by timestamp and remove duplicates by ID
        const sorted = updated.sort((a: Message, b: Message) => a.timestamp - b.timestamp);
        const unique = Array.from(
          new Map(sorted.map((msg: Message) => [msg.id, msg])).values()
        );
        
        return { ...old, data: unique, total: unique.length };
      });
    };

    const handleMessageDeleted = (event: CustomEvent<{ messageId: string }>) => {
      queryClient.setQueryData(['chat', 'messages'], (old: any) => {
        if (!old) return old;
        const filtered = old.data.filter((msg: Message) => msg.id !== event.detail.messageId);
        return { ...old, data: filtered };
      });
    };

    window.addEventListener('newMessage', handleNewMessage as EventListener);
    window.addEventListener('messageDeleted', handleMessageDeleted as EventListener);

    return () => {
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
      window.removeEventListener('messageDeleted', handleMessageDeleted as EventListener);
    };
  }, [queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setMessageInput(value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 1000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !isConnected) return;

    const messageContent = messageInput.trim();
    setMessageInput(''); // Clear input immediately for better UX
    
    // Send via Socket.IO for real-time (shows message immediately)
    sendMessage(messageContent);
    
    // Also send via API for persistence (in background, won't affect UI)
    sendMessageMutation.mutate(messageContent);
    setTyping(false);
  };

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleSaveEdit = () => {
    if (!editingMessageId || !editingContent.trim()) return;

    editMessage(editingMessageId, editingContent.trim());
    setEditingMessageId(null);
    setEditingContent('');
    queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleDelete = (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessage(messageId);
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, 'MMM d, h:mm a');
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach((message) => {
      const date = new Date(message.timestamp);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  // Function to add dummy messages for testing - also saves them to localStorage for persistence
  const addDummyMessages = () => {
    if (!user) return;

    const dummyMessages: Message[] = [
      {
        id: 'dummy_1',
        content: 'Hey everyone! Does anyone know when the next exam is scheduled?',
        authorId: 'user_sarah',
        authorName: 'Sarah',
        authorBatch: '22L-1234',
        timestamp: Date.now() - 3600000, // 1 hour ago
        reactions: [],
      },
      {
        id: 'dummy_2',
        content: 'I think it\'s next week. Let me check the announcement board.',
        authorId: 'user_ahmed',
        authorName: 'Ahmed',
        authorBatch: '22L-5678',
        timestamp: Date.now() - 3300000, // 55 minutes ago
        reactions: [],
      },
      {
        id: 'dummy_3',
        content: 'Important announcement: The library will be closed this weekend for maintenance.',
        authorId: 'user_admin',
        authorName: 'Admin',
        authorBatch: 'Admin',
        timestamp: Date.now() - 3000000, // 50 minutes ago
        reactions: [],
      },
      {
        id: 'dummy_4',
        content: 'Thanks for the heads up! Where can we study instead?',
        authorId: user.id,
        authorName: user.name,
        authorBatch: user.batch,
        timestamp: Date.now() - 2700000, // 45 minutes ago
        reactions: [],
      },
      {
        id: 'dummy_5',
        content: 'The study hall in building B is open 24/7. Also, there\'s a new coffee shop near campus.',
        authorId: 'user_maria',
        authorName: 'Maria',
        authorBatch: '21L-9012',
        timestamp: Date.now() - 2400000, // 40 minutes ago
        reactions: [],
      },
      {
        id: 'dummy_6',
        content: 'Has anyone started the project assignment yet? I need some help with the requirements.',
        authorId: 'user_john',
        authorName: 'John',
        authorBatch: '22L-3456',
        timestamp: Date.now() - 1800000, // 30 minutes ago
        reactions: [],
      },
      {
        id: 'dummy_7',
        content: 'I can help! Let\'s meet at the library tomorrow at 2 PM.',
        authorId: user.id,
        authorName: user.name,
        authorBatch: user.batch,
        timestamp: Date.now() - 900000, // 15 minutes ago
        reactions: [],
      },
      {
        id: 'dummy_8',
        content: 'Perfect! See you there. Don\'t forget to bring your laptop.',
        authorId: 'user_john',
        authorName: 'John',
        authorBatch: '22L-3456',
        timestamp: Date.now() - 600000, // 10 minutes ago
        reactions: [],
      },
    ];

    // Save to localStorage for persistence
    const existingMessages = JSON.parse(localStorage.getItem('campusbuddy_chat_messages') || '[]');
    const allMessages = [...existingMessages, ...dummyMessages];
    // Remove duplicates and sort by timestamp
    const uniqueMessages = Array.from(
      new Map(allMessages.map(msg => [msg.id, msg])).values()
    ).sort((a, b) => a.timestamp - b.timestamp);
    localStorage.setItem('campusbuddy_chat_messages', JSON.stringify(uniqueMessages));

    // Add dummy messages to the query cache
    queryClient.setQueryData(['chat', 'messages'], (old: any) => {
      const combined = old ? [...old.data, ...dummyMessages] : dummyMessages;
      // Remove duplicates
      const unique = Array.from(
        new Map(combined.map((msg: Message) => [msg.id, msg])).values()
      ).sort((a: Message, b: Message) => a.timestamp - b.timestamp);
      
      return {
        data: unique,
        total: unique.length,
        page: 1,
        limit: 50,
        hasMore: false,
      };
    });
  };

  // Load persisted messages from localStorage on mount
  useEffect(() => {
    const persistedMessages = localStorage.getItem('campusbuddy_chat_messages');
    if (persistedMessages && messages.length === 0) {
      try {
        const parsedMessages: Message[] = JSON.parse(persistedMessages);
        if (parsedMessages.length > 0) {
          queryClient.setQueryData(['chat', 'messages'], (old: any) => {
            if (!old) {
              return {
                data: parsedMessages,
                total: parsedMessages.length,
                page: 1,
                limit: 50,
                hasMore: false,
              };
            }
            // Merge with existing, remove duplicates
            const combined = [...old.data, ...parsedMessages];
            const unique = Array.from(
              new Map(combined.map((msg: Message) => [msg.id, msg])).values()
            ).sort((a: Message, b: Message) => a.timestamp - b.timestamp);
            return {
              ...old,
              data: unique,
              total: unique.length,
            };
          });
        }
      } catch (error) {
        console.error('Failed to load persisted messages:', error);
      }
    }
  }, []); // Only run on mount

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campus Chat</h1>
          <p className="text-gray-600">
            {isConnected ? (
              <span className="text-green-600 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></span>
                Connecting...
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Add dummy messages for testing if no messages exist
              if (messages.length === 0) {
                addDummyMessages();
                toast.success('Added dummy messages for testing!', { duration: 3000 });
                setTimeout(() => {
                  generateSummaryMutation.mutate();
                }, 1000);
              } else {
                generateSummaryMutation.mutate();
              }
            }}
            disabled={generateSummaryMutation.isPending}
            loading={generateSummaryMutation.isPending}
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Generate Summary
          </Button>
        </div>
      </div>

      {/* Messages Container */}
      <Card className="flex-1 flex flex-col min-h-0 mb-4">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : messagesError ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Unable to load messages</p>
              <p className="text-gray-400 mt-2">
                You can still send messages, but history may not be available.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No messages yet</p>
              <p className="text-gray-400 mt-2">
                Be the first to start the conversation!
              </p>
            </div>
          ) : (
            Object.entries(messageGroups).map(([dateKey, dayMessages]) => (
              <div key={dateKey}>
                {/* Date Separator */}
                <div className="text-center my-4">
                  <span className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
                    {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>

                {/* Messages for this day */}
                {dayMessages.map((message) => {
                  const isOwnMessage = message.authorId === user?.id;
                  const isEditing = editingMessageId === message.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 mb-4 group ${
                        isOwnMessage ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                          {message.authorName.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                        {/* Author Info */}
                        {!isOwnMessage && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {message.authorName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {message.authorBatch}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                        )}

                        {/* Message Bubble */}
                        {isEditing ? (
                          <div className="w-full">
                            <Input
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEdit();
                                }
                                if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              className="mb-2"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={!editingContent.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isOwnMessage
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            {message.edited && (
                              <p className="text-xs mt-1 opacity-70">
                                (edited)
                              </p>
                            )}
                          </div>
                        )}

                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.reactions.map((reaction, idx) => (
                              <button
                                key={idx}
                                onClick={() => addReaction(message.id, reaction.emoji)}
                                className={`text-xs px-2 py-1 rounded-full border ${
                                  reaction.userIds.includes(user?.id || '')
                                    ? 'bg-primary-100 border-primary-300'
                                    : 'bg-white border-gray-200'
                                } hover:bg-primary-50 transition-colors`}
                              >
                                {reaction.emoji} {reaction.count}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Actions (Edit/Delete) */}
                        {isOwnMessage && !isEditing && (
                          <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(message)}
                              className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1"
                            >
                              <PencilIcon className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(message.id)}
                              className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                            >
                              <TrashIcon className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        )}

                        {/* Timestamp for own messages */}
                        {isOwnMessage && (
                          <span className="text-xs text-gray-400 mt-1">
                            {formatMessageTime(message.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* Message Input */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <div className="flex-1">
              <Input
                value={messageInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                disabled={!isConnected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
            </div>
            <Button
              type="submit"
              disabled={!messageInput.trim() || !isConnected || sendMessageMutation.isPending}
              loading={sendMessageMutation.isPending}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </Button>
          </form>

          {/* Quick Reactions */}
          {isConnected && (
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-gray-500">Quick reactions:</span>
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    // Find the last message to react to
                    if (messages.length > 0) {
                      addReaction(messages[messages.length - 1].id, emoji);
                    }
                  }}
                  className="text-lg hover:scale-125 transition-transform"
                  disabled={messages.length === 0}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Modal */}
      <Modal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title="Chat Summary"
        size="lg"
      >
        {currentSummary ? (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Messages Analyzed: {currentSummary.messageCount}
                </span>
                <span className="text-xs text-gray-500">
                  {format(new Date(currentSummary.generatedAt), 'MMM d, h:mm a')}
                </span>
              </div>
              {currentSummary.timeRange && (
                <div className="text-xs text-gray-500">
                  Time Range: {format(new Date(currentSummary.timeRange.start), 'MMM d, h:mm a')} - {format(new Date(currentSummary.timeRange.end), 'MMM d, h:mm a')}
                </div>
              )}
            </div>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {currentSummary.summary}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Loading summary...
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ChatPage;
