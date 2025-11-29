import { Server, Socket } from 'socket.io';
import { auth, db } from '../config/database';
import { User, Message, SocketEvents } from '../../../shared/types';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

// Store online users
const onlineUsers = new Map<string, string>(); // userId -> socketId
const userSockets = new Map<string, string>(); // socketId -> userId

export const initializeSocketHandlers = (io: Server) => {
  // Authentication middleware - verify Firebase ID token
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify Firebase ID token
      const decodedToken = await auth.verifyIdToken(token);
      
      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists) {
        return next(new Error('User not found'));
      }

      const userData = userDoc.data() as User;
      socket.user = userData;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.user?.name} connected with socket ${socket.id}`);

    if (socket.user) {
      // Store user connection
      onlineUsers.set(socket.user.id, socket.id);
      userSockets.set(socket.id, socket.user.id);

      // Update user online status
      db.collection('users').doc(socket.user.id).update({
        isOnline: true
      });

      // Notify others that user is online
      socket.broadcast.emit('user:online', { userId: socket.user.id });

      // Join user to their personal room for direct notifications
      socket.join(`user:${socket.user.id}`);
    }

    // Handle chat message sending
    socket.on('message:send', async (data: Omit<Message, 'id' | 'timestamp'>) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        const message: Omit<Message, 'id'> = {
          content: data.content.trim(),
          authorId: socket.user.id,
          authorName: socket.user.name,
          authorBatch: socket.user.batch,
          timestamp: Date.now(),
          reactions: []
        };

        // Save message to database
        const docRef = await db.collection('messages').add(message);
        const newMessage: Message = { id: docRef.id, ...message };

        // Broadcast message to all connected clients
        io.emit('message:receive', newMessage);

        // Award points for sending message
        await db.collection('users').doc(socket.user.id).update({
          points: socket.user.points + 1
        });

        // Log activity
        await db.collection('userActivities').add({
          userId: socket.user.id,
          type: 'message',
          description: 'Sent a message in chat',
          points: 1,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message editing
    socket.on('message:edit', async (data: { messageId: string; content: string }) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        const { messageId, content } = data;

        // Get message from database
        const messageDoc = await db.collection('messages').doc(messageId).get();
        if (!messageDoc.exists) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        const messageData = messageDoc.data() as Message;

        // Check if user owns the message
        if (messageData.authorId !== socket.user.id) {
          socket.emit('error', { message: 'You can only edit your own messages' });
          return;
        }

        // Update message
        await db.collection('messages').doc(messageId).update({
          content: content.trim(),
          edited: true,
          editedAt: Date.now()
        });

        // Get updated message
        const updatedDoc = await db.collection('messages').doc(messageId).get();
        const updatedMessage = { id: updatedDoc.id, ...updatedDoc.data() } as Message;

        // Broadcast updated message
        io.emit('message:receive', updatedMessage);

      } catch (error) {
        console.error('Edit message error:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Handle message deletion
    socket.on('message:delete', async (data: { messageId: string }) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        const { messageId } = data;

        // Get message from database
        const messageDoc = await db.collection('messages').doc(messageId).get();
        if (!messageDoc.exists) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        const messageData = messageDoc.data() as Message;

        // Check if user owns the message or is admin
        if (messageData.authorId !== socket.user.id && socket.user.role !== 'admin') {
          socket.emit('error', { message: 'You can only delete your own messages' });
          return;
        }

        // Delete message
        await db.collection('messages').doc(messageId).delete();

        // Broadcast deletion
        io.emit('message:delete', { messageId });

      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Handle message reactions
    socket.on('message:reaction', async (data: { messageId: string; emoji: string }) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        const { messageId, emoji } = data;

        // Get message from database
        const messageDoc = await db.collection('messages').doc(messageId).get();
        if (!messageDoc.exists) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        const messageData = messageDoc.data() as Message;
        const reactions = messageData.reactions || [];

        // Find existing reaction with this emoji
        const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);

        if (existingReactionIndex >= 0) {
          const existingReaction = reactions[existingReactionIndex];
          const userIndex = existingReaction.userIds.indexOf(socket.user.id);

          if (userIndex >= 0) {
            // Remove user's reaction
            existingReaction.userIds.splice(userIndex, 1);
            existingReaction.count = existingReaction.userIds.length;

            // Remove reaction if no users left
            if (existingReaction.count === 0) {
              reactions.splice(existingReactionIndex, 1);
            }
          } else {
            // Add user's reaction
            existingReaction.userIds.push(socket.user.id);
            existingReaction.count = existingReaction.userIds.length;
          }
        } else {
          // Create new reaction
          reactions.push({
            emoji,
            userIds: [socket.user.id],
            count: 1
          });
        }

        // Update message with new reactions
        await db.collection('messages').doc(messageId).update({ reactions });

        // Get updated message
        const updatedDoc = await db.collection('messages').doc(messageId).get();
        const updatedMessage = { id: updatedDoc.id, ...updatedDoc.data() } as Message;

        // Broadcast updated message
        io.emit('message:receive', updatedMessage);

      } catch (error) {
        console.error('Message reaction error:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Handle typing indicators
    socket.on('user:typing', (data: { isTyping: boolean }) => {
      if (socket.user) {
        socket.broadcast.emit('user:typing', {
          userId: socket.user.id,
          isTyping: data.isTyping
        });
      }
    });

    // Handle new announcements
    socket.on('announcement:new', async (announcementId: string) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        // Only society heads and admins can broadcast announcements
        if (!['society_head', 'admin'].includes(socket.user.role)) {
          socket.emit('error', { message: 'Insufficient permissions' });
          return;
        }

        // Get announcement from database
        const announcementDoc = await db.collection('announcements').doc(announcementId).get();
        if (!announcementDoc.exists) {
          socket.emit('error', { message: 'Announcement not found' });
          return;
        }

        const announcement = { id: announcementDoc.id, ...announcementDoc.data() };

        // Broadcast announcement to all users
        io.emit('announcement:new', announcement);

      } catch (error) {
        console.error('Broadcast announcement error:', error);
        socket.emit('error', { message: 'Failed to broadcast announcement' });
      }
    });

    // Handle campus status updates
    socket.on('status:update', async (statusId: string) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        // Get status from database
        const statusDoc = await db.collection('campusStatus').doc(statusId).get();
        if (!statusDoc.exists) {
          socket.emit('error', { message: 'Status not found' });
          return;
        }

        const status = { id: statusDoc.id, ...statusDoc.data() };

        // Broadcast status update to all users
        io.emit('status:update', status);

      } catch (error) {
        console.error('Broadcast status update error:', error);
        socket.emit('error', { message: 'Failed to broadcast status update' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user?.name} disconnected`);

      if (socket.user) {
        // Remove user from online users
        onlineUsers.delete(socket.user.id);
        userSockets.delete(socket.id);

        // Update user offline status
        await db.collection('users').doc(socket.user.id).update({
          isOnline: false
        });

        // Notify others that user is offline
        socket.broadcast.emit('user:offline', { userId: socket.user.id });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Helper function to send notification to specific user
  const sendNotificationToUser = (userId: string, notification: any) => {
    const socketId = onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('notification', notification);
    }
  };

  // Helper function to send notification to all users
  const broadcastNotification = (notification: any) => {
    io.emit('notification', notification);
  };

  return { sendNotificationToUser, broadcastNotification };
};
