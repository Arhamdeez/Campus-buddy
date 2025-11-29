import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { apiService } from '../services/api';
import type { Message } from '@shared/types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['chat', 'messages'],
    queryFn: async () => {
      const response = await apiService.chat.getMessages({ limit: 50 });
      return response.data.data;
    },
  });

  const messages: Message[] = messagesData?.data || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiService.chat.sendMessage(content);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
      setMessageInput('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send message');
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
    onSuccess: (summary) => {
      toast.success('Chat summary generated!', {
        duration: 8000,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to generate summary');
    },
  });

  // Listen for new messages via Socket.IO
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent<Message>) => {
      queryClient.setQueryData(['chat', 'messages'], (old: any) => {
        if (!old) return old;
        const newMessages = [...old.data, event.detail];
        return { ...old, data: newMessages };
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

    // Send via Socket.IO for real-time
    sendMessage(messageInput.trim());
    
    // Also send via API for persistence
    sendMessageMutation.mutate(messageInput.trim());
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

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campus Chat</h1>
          <p className="text-gray-600">
            {isConnected ? (
              <span className="text-green-600">● Connected</span>
            ) : (
              <span className="text-red-600">● Disconnected</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => generateSummaryMutation.mutate()}
          disabled={generateSummaryMutation.isPending || messages.length === 0}
          loading={generateSummaryMutation.isPending}
        >
          <SparklesIcon className="h-4 w-4 mr-2" />
          Generate Summary
        </Button>
      </div>

      {/* Messages Container */}
      <Card className="flex-1 flex flex-col min-h-0 mb-4">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading messages...</p>
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
    </div>
  );
};

export default ChatPage;
