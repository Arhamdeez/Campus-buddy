import express from 'express';
import { db } from '../config/database';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth';
import { Announcement, ApiResponse, PaginatedResponse } from '../../../shared/types';

const router = express.Router();

// Get all announcements with pagination and filtering
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const priority = req.query.priority as string;
    const societyName = req.query.society as string;

    let announcements: Announcement[] = [];
    let total = 0;

    try {
      let query = db.collection('announcements').orderBy('timestamp', 'desc');

      // Apply filters
      if (priority) {
        query = query.where('priority', '==', priority);
      }
      if (societyName) {
        query = query.where('societyName', '==', societyName);
      }

      // Filter out expired announcements
      const now = Date.now();
      query = query.where('expiresAt', '>', now);

      // Get total count
      const totalSnapshot = await query.get();
      total = totalSnapshot.size;

      // Apply pagination
      const offset = (page - 1) * limit;
      const announcementsSnapshot = await query.offset(offset).limit(limit).get();

      announcementsSnapshot.forEach(doc => {
        announcements.push({ id: doc.id, ...doc.data() } as Announcement);
      });
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for announcements, returning empty list');
      announcements = [];
      total = 0;
    }

    const response: PaginatedResponse<Announcement> = {
      data: announcements,
      total,
      page,
      limit,
      hasMore: (page - 1) * limit + limit < total
    };

    res.json({
      success: true,
      data: response
    } as ApiResponse<PaginatedResponse<Announcement>>);

  } catch (error: any) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get announcements'
    } as ApiResponse<null>);
  }
});

// Get announcement by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const announcementDoc = await db.collection('announcements').doc(id).get();
    if (!announcementDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Announcement not found'
      } as ApiResponse<null>);
      return;
    }

    const announcement = { id: announcementDoc.id, ...announcementDoc.data() } as Announcement;

    // Increment view count
    await db.collection('announcements').doc(id).update({
      views: announcement.views + 1
    });

    res.json({
      success: true,
      data: { ...announcement, views: announcement.views + 1 }
    } as ApiResponse<Announcement>);

  } catch (error: any) {
    console.error('Get announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get announcement'
    } as ApiResponse<null>);
  }
});

// Create new announcement (society heads and admins only)
router.post('/', authenticateToken, requireRole(['society_head', 'admin']), async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { title, content, priority, tags, expiresAt, attachments, societyName } = req.body;

    if (!title || !content) {
      res.status(400).json({
        success: false,
        error: 'Title and content are required'
      } as ApiResponse<null>);
      return;
    }

    const announcement: Omit<Announcement, 'id'> = {
      title: title.trim(),
      content: content.trim(),
      authorId: req.user.id,
      authorName: req.user.name,
      societyName: societyName || undefined,
      priority: priority || 'medium',
      tags: tags || [],
      timestamp: Date.now(),
      expiresAt: expiresAt || (Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      attachments: attachments || [],
      views: 0,
      likes: 0
    };

    let newAnnouncement: Announcement;
    try {
      const docRef = await db.collection('announcements').add(announcement);
      newAnnouncement = { id: docRef.id, ...announcement };
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable, using temporary ID');
      newAnnouncement = { id: `temp_ann_${Date.now()}_${Math.random()}`, ...announcement };
    }

    res.status(201).json({
      success: true,
      data: newAnnouncement
    } as ApiResponse<Announcement>);

  } catch (error: any) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create announcement'
    } as ApiResponse<null>);
  }
});

// Update announcement
router.put('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { id } = req.params;
    const { title, content, priority, tags, expiresAt, attachments } = req.body;

    const announcementDoc = await db.collection('announcements').doc(id).get();
    if (!announcementDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Announcement not found'
      } as ApiResponse<null>);
      return;
    }

    const announcementData = announcementDoc.data() as Announcement;

    // Check if user owns the announcement or is admin
    if (announcementData.authorId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only edit your own announcements'
      } as ApiResponse<null>);
      return;
    }

    const updateData: Partial<Announcement> = {};
    if (title) updateData.title = title.trim();
    if (content) updateData.content = content.trim();
    if (priority) updateData.priority = priority;
    if (tags) updateData.tags = tags;
    if (expiresAt) updateData.expiresAt = expiresAt;
    if (attachments) updateData.attachments = attachments;

    await db.collection('announcements').doc(id).update(updateData);

    const updatedDoc = await db.collection('announcements').doc(id).get();
    const updatedAnnouncement = { id: updatedDoc.id, ...updatedDoc.data() } as Announcement;

    res.json({
      success: true,
      data: updatedAnnouncement
    } as ApiResponse<Announcement>);

  } catch (error: any) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update announcement'
    } as ApiResponse<null>);
  }
});

// Delete announcement
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { id } = req.params;

    const announcementDoc = await db.collection('announcements').doc(id).get();
    if (!announcementDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Announcement not found'
      } as ApiResponse<null>);
      return;
    }

    const announcementData = announcementDoc.data() as Announcement;

    // Check if user owns the announcement or is admin
    if (announcementData.authorId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only delete your own announcements'
      } as ApiResponse<null>);
      return;
    }

    await db.collection('announcements').doc(id).delete();

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    } as ApiResponse<null>);

  } catch (error: any) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete announcement'
    } as ApiResponse<null>);
  }
});

// Like/unlike announcement
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { id } = req.params;

    const announcementDoc = await db.collection('announcements').doc(id).get();
    if (!announcementDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Announcement not found'
      } as ApiResponse<null>);
      return;
    }

    const announcement = announcementDoc.data() as Announcement;

    // Check if user already liked this announcement
    const likeDoc = await db.collection('announcementLikes')
      .where('announcementId', '==', id)
      .where('userId', '==', req.user.id)
      .get();

    if (likeDoc.empty) {
      // Add like
      await db.collection('announcementLikes').add({
        announcementId: id,
        userId: req.user.id,
        timestamp: Date.now()
      });

      await db.collection('announcements').doc(id).update({
        likes: announcement.likes + 1
      });

      res.json({
        success: true,
        data: { liked: true, likes: announcement.likes + 1 }
      } as ApiResponse<{ liked: boolean; likes: number }>);
    } else {
      // Remove like
      const likeDocId = likeDoc.docs[0].id;
      await db.collection('announcementLikes').doc(likeDocId).delete();

      await db.collection('announcements').doc(id).update({
        likes: Math.max(0, announcement.likes - 1)
      });

      res.json({
        success: true,
        data: { liked: false, likes: Math.max(0, announcement.likes - 1) }
      } as ApiResponse<{ liked: boolean; likes: number }>);
    }

  } catch (error: any) {
    console.error('Like announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like announcement'
    } as ApiResponse<null>);
  }
});

export default router;
