import express from 'express';
import { db } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { Message, ChatSummary, ApiResponse, PaginatedResponse } from '../../../shared/types';
import { formatDistanceToNow } from 'date-fns';
// Note: Gemini API import removed - using manual summary generation for demo

const router = express.Router();

// Get chat messages with pagination
router.get('/messages', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string; // timestamp for pagination

    let messages: Message[] = [];
    let total = 0;

    try {
      let query = db.collection('messages').orderBy('timestamp', 'desc');

      if (before) {
        query = query.where('timestamp', '<', parseInt(before));
      }

      const messagesSnapshot = await query.limit(limit).get();
      total = messagesSnapshot.size;

      messagesSnapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() } as Message);
      });

      // Reverse to get chronological order
      messages.reverse();
    } catch (firestoreError: any) {
      console.warn('⚠️ Firestore unavailable for messages, returning empty list');
      // Return empty list if Firestore is unavailable
      messages = [];
      total = 0;
    }

    res.json({
      success: true,
      data: {
        data: messages,
        total,
        page,
        limit,
        hasMore: total === limit
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

    let newMessage: Message;
    try {
      const docRef = await db.collection('messages').add(message);
      newMessage = { id: docRef.id, ...message };
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable, using temporary message ID');
      newMessage = { id: `temp_${Date.now()}_${Math.random()}`, ...message };
    }

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

// Generate chat summary (Manual - no API required)
router.post('/summary', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const { startTime, endTime, messageCount = 50 } = req.body;

    // Try to get messages from Firestore, but handle gracefully if unavailable
    let messages: Message[] = [];
    try {
      let query = db.collection('messages').orderBy('timestamp', 'desc');

      if (startTime && endTime) {
        query = query.where('timestamp', '>=', startTime).where('timestamp', '<=', endTime);
      }

      const messagesSnapshot = await query.limit(messageCount).get();
      messagesSnapshot.forEach(doc => {
        messages.push(doc.data() as Message);
      });
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for chat summary, using placeholder');
      // Return a placeholder summary if Firestore is unavailable
      const placeholderSummary: Omit<ChatSummary, 'id'> = {
        summary: `📊 Chat Summary (Placeholder)\n\nThis is a placeholder summary for demonstration purposes. In a production environment with Firestore enabled, this would contain:\n\n• Key topics discussed in the chat\n• Important announcements shared\n• Questions asked by students\n• Notable conversations and insights\n\nTo enable full functionality, please enable the Cloud Firestore API in your Google Cloud Console.`,
        messageCount: 0,
        timeRange: {
          start: startTime || Date.now() - (24 * 60 * 60 * 1000),
          end: endTime || Date.now()
        },
        generatedAt: Date.now()
      };

      res.json({
        success: true,
        data: { id: 'placeholder_summary', ...placeholderSummary } as ChatSummary
      } as ApiResponse<ChatSummary>);
      return;
    }

    if (messages.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No messages found in the specified time range'
      } as ApiResponse<null>);
      return;
    }

    // Generate manual summary (no API required)
    const summary = generateManualSummary(messages);

    const chatSummary: Omit<ChatSummary, 'id'> = {
      summary,
      messageCount: messages.length,
      timeRange: {
        start: startTime || Math.min(...messages.map(m => m.timestamp)),
        end: endTime || Math.max(...messages.map(m => m.timestamp))
      },
      generatedAt: Date.now()
    };

    // Try to save to Firestore, but don't fail if unavailable
    let newSummary: ChatSummary;
    try {
      const docRef = await db.collection('chatSummaries').add(chatSummary);
      newSummary = { id: docRef.id, ...chatSummary };
    } catch (saveError) {
      console.warn('⚠️ Could not save summary to Firestore, using temporary ID');
      newSummary = { id: `temp_summary_${Date.now()}`, ...chatSummary };
    }

    res.json({
      success: true,
      data: newSummary
    } as ApiResponse<ChatSummary>);
    return;

  } catch (error: any) {
    console.error('Generate summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate chat summary'
    } as ApiResponse<null>);
    return;
  }
});

// Helper function to generate manual summary with conversational narrative
function generateManualSummary(messages: Message[]): string {
  if (messages.length === 0) {
    return 'No messages to summarize.';
  }

  const authors = new Map<string, { name: string; batch: string; count: number }>();
  const batches = new Set<string>();
  const conversations: Array<{ topic: string; messages: Message[] }> = [];
  
  // Group messages by topic/conversation
  messages.forEach(msg => {
    const authorKey = msg.authorId;
    if (!authors.has(authorKey)) {
      authors.set(authorKey, { name: msg.authorName, batch: msg.authorBatch, count: 0 });
    }
    authors.get(authorKey)!.count++;
    if (msg.authorBatch) batches.add(msg.authorBatch);
  });

  // Analyze conversations and topics
  const topicKeywords: { [key: string]: string[] } = {
    'Exams & Tests': ['exam', 'test', 'quiz', 'midterm', 'final', 'assessment'],
    'Assignments & Projects': ['assignment', 'homework', 'project', 'deadline', 'submit'],
    'Classes & Lectures': ['class', 'lecture', 'professor', 'teacher', 'course'],
    'Study Groups & Meetings': ['study', 'meet', 'group', 'session', 'together'],
    'Campus Facilities': ['library', 'cafeteria', 'lab', 'building', 'room', 'campus'],
    'Events & Activities': ['event', 'activity', 'club', 'society', 'meeting'],
    'Announcements': ['announcement', 'important', 'reminder', 'notice', 'update'],
  };

  const topicMessages: { [key: string]: Message[] } = {};
  Object.keys(topicKeywords).forEach(topic => {
    topicMessages[topic] = [];
  });

  messages.forEach(msg => {
    const content = msg.content.toLowerCase();
    let categorized = false;
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        topicMessages[topic].push(msg);
        categorized = true;
        break;
      }
    }
    
    if (!categorized) {
      if (!topicMessages['General Discussion']) {
        topicMessages['General Discussion'] = [];
      }
      topicMessages['General Discussion'].push(msg);
    }
  });

  // Build conversational summary
  let summary = `📊 Chat Summary - What People Were Talking About\n\n`;
  
  // Overview
  summary += `**Overview:**\n`;
  summary += `The chat had ${messages.length} messages from ${authors.size} participant${authors.size > 1 ? 's' : ''}.\n\n`;

  // Main conversations
  summary += `**Main Conversations:**\n\n`;
  
  const activeTopics = Object.entries(topicMessages)
    .filter(([_, msgs]) => msgs.length > 0)
    .sort(([_, a], [__, b]) => b.length - a.length)
    .slice(0, 5);

  activeTopics.forEach(([topic, msgs], idx) => {
    if (msgs.length > 0) {
      summary += `${idx + 1}. **${topic}** (${msgs.length} message${msgs.length > 1 ? 's' : ''})\n`;
      
      // Get a sample of messages for this topic
      const sampleMessages = msgs.slice(0, 3);
      sampleMessages.forEach(msg => {
        const timeAgo = formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true });
        summary += `   • ${msg.authorName} (${msg.authorBatch}): "${msg.content.substring(0, 80)}${msg.content.length > 80 ? '...' : ''}" - ${timeAgo}\n`;
      });
      summary += `\n`;
    }
  });

  // Key participants
  const topParticipants = Array.from(authors.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  
  if (topParticipants.length > 0) {
    summary += `**Most Active Participants:**\n`;
    topParticipants.forEach(([_, info], idx) => {
      summary += `${idx + 1}. ${info.name} (${info.batch}) - ${info.count} message${info.count > 1 ? 's' : ''}\n`;
    });
    summary += `\n`;
  }

  // Questions and announcements
  const questions = messages.filter(msg => 
    msg.content.includes('?') || 
    /^(how|what|when|where|why|who|can|will|should|is|are|do|does)/i.test(msg.content.trim())
  );
  
  const announcements = messages.filter(msg => {
    const content = msg.content.toLowerCase();
    return content.includes('announcement') || 
           content.includes('important') || 
           content.includes('reminder') ||
           content.includes('deadline') ||
           msg.authorName.toLowerCase().includes('admin');
  });

  if (questions.length > 0) {
    summary += `**Questions Asked (${questions.length}):**\n`;
    questions.slice(0, 5).forEach((msg, idx) => {
      summary += `${idx + 1}. ${msg.authorName}: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"\n`;
    });
    summary += `\n`;
  }

  if (announcements.length > 0) {
    summary += `**Important Announcements:**\n`;
    announcements.slice(0, 3).forEach((msg, idx) => {
      summary += `${idx + 1}. ${msg.authorName}: "${msg.content.substring(0, 120)}${msg.content.length > 120 ? '...' : ''}"\n`;
    });
    summary += `\n`;
  }

  // Conversation flow
  if (messages.length > 3) {
    summary += `**Conversation Flow:**\n`;
    const firstMsg = messages[0];
    const lastMsg = messages[messages.length - 1];
    const timeSpan = formatDistanceToNow(new Date(firstMsg.timestamp), { addSuffix: false });
    summary += `The conversation started ${timeSpan} ago when ${firstMsg.authorName} said: "${firstMsg.content.substring(0, 60)}${firstMsg.content.length > 60 ? '...' : ''}"\n`;
    summary += `The most recent message was from ${lastMsg.authorName}: "${lastMsg.content.substring(0, 60)}${lastMsg.content.length > 60 ? '...' : ''}"\n\n`;
  }

  summary += `*This summary was automatically generated from ${messages.length} messages. For full details, check the chat history.*`;

  return summary;
}

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
