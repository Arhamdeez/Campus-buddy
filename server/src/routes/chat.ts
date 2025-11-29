import express from 'express';
import { db } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { Message, ChatSummary, ApiResponse, PaginatedResponse } from '../../../shared/types';
import openai from '../config/openai';

const router = express.Router();

// Get chat messages with pagination
router.get('/messages', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string; // timestamp for pagination

    let query = db.collection('messages').orderBy('timestamp', 'desc');

    if (before) {
      query = query.where('timestamp', '<', parseInt(before));
    }

    const messagesSnapshot = await query.limit(limit).get();
    const messages: Message[] = [];

    messagesSnapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() } as Message);
    });

    // Reverse to get chronological order
    messages.reverse();

    res.json({
      success: true,
      data: {
        data: messages,
        total: messagesSnapshot.size,
        page,
        limit,
        hasMore: messagesSnapshot.size === limit
      }
    } as ApiResponse<PaginatedResponse<Message>>);

  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    } as ApiResponse<null>);
  }
});

// Send a new message
router.post('/messages', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Message content is required'
      } as ApiResponse<null>);
      return;
    }

    const message: Omit<Message, 'id'> = {
      content: content.trim(),
      authorId: req.user.id,
      authorName: req.user.name,
      authorBatch: req.user.batch,
      timestamp: Date.now(),
      reactions: []
    };

    const docRef = await db.collection('messages').add(message);
    const newMessage: Message = { id: docRef.id, ...message };

    res.status(201).json({
      success: true,
      data: newMessage
    } as ApiResponse<Message>);

  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    } as ApiResponse<null>);
  }
});

// Edit a message
router.put('/messages/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { id } = req.params;
    const { content } = req.body;

    const messageDoc = await db.collection('messages').doc(id).get();
    if (!messageDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Message not found'
      } as ApiResponse<null>);
      return;
    }

    const messageData = messageDoc.data() as Message;

    // Check if user owns the message
    if (messageData.authorId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'You can only edit your own messages'
      } as ApiResponse<null>);
      return;
    }

    await db.collection('messages').doc(id).update({
      content: content.trim(),
      edited: true,
      editedAt: Date.now()
    });

    const updatedDoc = await db.collection('messages').doc(id).get();
    const updatedMessage = { id: updatedDoc.id, ...updatedDoc.data() } as Message;

    res.json({
      success: true,
      data: updatedMessage
    } as ApiResponse<Message>);

  } catch (error: any) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to edit message'
    } as ApiResponse<null>);
  }
});

// Delete a message
router.delete('/messages/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { id } = req.params;

    const messageDoc = await db.collection('messages').doc(id).get();
    if (!messageDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Message not found'
      } as ApiResponse<null>);
      return;
    }

    const messageData = messageDoc.data() as Message;

    // Check if user owns the message or is admin
    if (messageData.authorId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only delete your own messages'
      } as ApiResponse<null>);
      return;
    }

    await db.collection('messages').doc(id).delete();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    } as ApiResponse<null>);

  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    } as ApiResponse<null>);
  }
});

// Generate chat summary
router.post('/summary', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { startTime, endTime, messageCount = 50 } = req.body;

    let query = db.collection('messages').orderBy('timestamp', 'desc');

    if (startTime && endTime) {
      query = query.where('timestamp', '>=', startTime).where('timestamp', '<=', endTime);
    }

    const messagesSnapshot = await query.limit(messageCount).get();
    const messages: Message[] = [];

    messagesSnapshot.forEach(doc => {
      messages.push(doc.data() as Message);
    });

    if (messages.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No messages found in the specified time range'
      } as ApiResponse<null>);
      return;
    }

    // Prepare messages for summarization
    const messageTexts = messages.map(msg => 
      `${msg.authorName} (${msg.authorBatch}): ${msg.content}`
    ).join('\n');

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes chat conversations for university students. Provide a concise summary highlighting key topics, announcements, questions, and important information discussed."
        },
        {
          role: "user",
          content: `Please summarize this chat conversation:\n\n${messageTexts}`
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary';

    const chatSummary: Omit<ChatSummary, 'id'> = {
      summary,
      messageCount: messages.length,
      timeRange: {
        start: startTime || Math.min(...messages.map(m => m.timestamp)),
        end: endTime || Math.max(...messages.map(m => m.timestamp))
      },
      generatedAt: Date.now()
    };

    const docRef = await db.collection('chatSummaries').add(chatSummary);
    const newSummary: ChatSummary = { id: docRef.id, ...chatSummary };

    res.json({
      success: true,
      data: newSummary
    } as ApiResponse<ChatSummary>);

  } catch (error: any) {
    console.error('Generate summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate chat summary'
    } as ApiResponse<null>);
  }
});

// Get chat summaries
router.get('/summaries', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const summariesSnapshot = await db.collection('chatSummaries')
      .orderBy('generatedAt', 'desc')
      .limit(limit)
      .get();

    const summaries: ChatSummary[] = [];
    summariesSnapshot.forEach(doc => {
      summaries.push({ id: doc.id, ...doc.data() } as ChatSummary);
    });

    res.json({
      success: true,
      data: summaries
    } as ApiResponse<ChatSummary[]>);

  } catch (error: any) {
    console.error('Get summaries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat summaries'
    } as ApiResponse<null>);
  }
});

export default router;
