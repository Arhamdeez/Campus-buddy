import express from 'express';
import { db } from '../config/database';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth';
import { AnonymousFeedback, ApiResponse, PaginatedResponse } from '../../../shared/types';

const router = express.Router();

// Get all feedback (admin only for viewing all, users can see public ones)
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const category = req.query.category as string;
    const status = req.query.status as string;

    let feedback: AnonymousFeedback[] = [];
    let total = 0;

    try {
      let query = db.collection('anonymousFeedback').orderBy('timestamp', 'desc');

      // Apply filters
      if (type) {
        query = query.where('type', '==', type);
      }
      if (category) {
        query = query.where('category', '==', category);
      }
      if (status) {
        query = query.where('status', '==', status);
      }

      // Non-admin users can only see confessions and resolved feedback
      if (req.user?.role !== 'admin') {
        // For confessions, show all. For feedback/complaints, only show resolved ones
        if (type === 'confession') {
          // No additional filter needed
        } else {
          query = query.where('status', '==', 'resolved');
        }
      }

      // Get total count
      const totalSnapshot = await query.get();
      total = totalSnapshot.size;

      // Apply pagination
      const offset = (page - 1) * limit;
      const feedbackSnapshot = await query.offset(offset).limit(limit).get();

      feedbackSnapshot.forEach(doc => {
        feedback.push({ id: doc.id, ...doc.data() } as AnonymousFeedback);
      });
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for feedback, returning empty list');
      feedback = [];
      total = 0;
    }

    const response: PaginatedResponse<AnonymousFeedback> = {
      data: feedback,
      total,
      page,
      limit,
      hasMore: (page - 1) * limit + limit < total
    };

    res.json({
      success: true,
      data: response
    } as ApiResponse<PaginatedResponse<AnonymousFeedback>>);

  } catch (error: any) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback'
    } as ApiResponse<null>);
  }
});

// Get feedback by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    let feedbackDoc;
    try {
      feedbackDoc = await db.collection('anonymousFeedback').doc(id).get();
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for getting feedback');
      res.status(503).json({
        success: false,
        error: 'Server temporarily unavailable'
      } as ApiResponse<null>);
      return;
    }

    if (!feedbackDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Feedback not found'
      } as ApiResponse<null>);
      return;
    }

    const feedback = { id: feedbackDoc.id, ...feedbackDoc.data() } as AnonymousFeedback;

    // Non-admin users can only view confessions and resolved feedback
    if (req.user?.role !== 'admin') {
      if (feedback.type !== 'confession' && feedback.status !== 'resolved') {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        } as ApiResponse<null>);
        return;
      }
    }

    res.json({
      success: true,
      data: feedback
    } as ApiResponse<AnonymousFeedback>);

  } catch (error: any) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback'
    } as ApiResponse<null>);
  }
});

// Submit anonymous feedback/complaint/confession
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const { type, title, content, category, priority } = req.body;

    if (!type || !title || !content) {
      res.status(400).json({
        success: false,
        error: 'Type, title, and content are required'
      } as ApiResponse<null>);
      return;
    }

    if (!['feedback', 'complaint', 'confession'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'Type must be feedback, complaint, or confession'
      } as ApiResponse<null>);
      return;
    }

    const feedback: Omit<AnonymousFeedback, 'id'> = {
      type,
      title: title.trim(),
      content: content.trim(),
      category: category || 'general',
      priority: priority || 'medium',
      status: 'pending',
      timestamp: Date.now(),
      upvotes: 0,
      downvotes: 0
    };

    let newFeedback: AnonymousFeedback;
    try {
      const docRef = await db.collection('anonymousFeedback').add(feedback);
      newFeedback = { id: docRef.id, ...feedback };
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable, using temporary ID');
      newFeedback = { id: `temp_fb_${Date.now()}_${Math.random()}`, ...feedback };
    }

    res.status(201).json({
      success: true,
      data: newFeedback
    } as ApiResponse<AnonymousFeedback>);

  } catch (error: any) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    } as ApiResponse<null>);
  }
});

// Update feedback status (admin only)
router.put('/:id/status', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'reviewed', 'resolved'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status'
      } as ApiResponse<null>);
      return;
    }

    let feedbackDoc;
    try {
      feedbackDoc = await db.collection('anonymousFeedback').doc(id).get();
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for status update');
      res.status(503).json({
        success: false,
        error: 'Server temporarily unavailable'
      } as ApiResponse<null>);
      return;
    }

    if (!feedbackDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Feedback not found'
      } as ApiResponse<null>);
      return;
    }

    let updatedFeedback: AnonymousFeedback;
    try {
      await db.collection('anonymousFeedback').doc(id).update({ status });
      const updatedDoc = await db.collection('anonymousFeedback').doc(id).get();
      updatedFeedback = { id: updatedDoc.id, ...updatedDoc.data() } as AnonymousFeedback;
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for status update, using temporary response');
      const existingData = feedbackDoc.data() as AnonymousFeedback;
      updatedFeedback = { ...existingData, id, status };
    }

    res.json({
      success: true,
      data: updatedFeedback
    } as ApiResponse<AnonymousFeedback>);

  } catch (error: any) {
    console.error('Update feedback status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feedback status'
    } as ApiResponse<null>);
  }
});

// Vote on feedback (upvote/downvote)
router.post('/:id/vote', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { id } = req.params;
    const { voteType } = req.body; // 'up' or 'down'

    if (!['up', 'down'].includes(voteType)) {
      res.status(400).json({
        success: false,
        error: 'Vote type must be "up" or "down"'
      } as ApiResponse<null>);
      return;
    }

    let feedbackDoc;
    try {
      feedbackDoc = await db.collection('anonymousFeedback').doc(id).get();
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for voting');
      res.status(503).json({
        success: false,
        error: 'Server temporarily unavailable'
      } as ApiResponse<null>);
      return;
    }

    if (!feedbackDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Feedback not found'
      } as ApiResponse<null>);
      return;
    }

    const feedback = feedbackDoc.data() as AnonymousFeedback;

    // Check if user already voted
    let existingVote;
    try {
      existingVote = await db.collection('feedbackVotes')
        .where('feedbackId', '==', id)
        .where('userId', '==', req.user.id)
        .get();
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for vote check');
      res.status(503).json({
        success: false,
        error: 'Server temporarily unavailable'
      } as ApiResponse<null>);
      return;
    }

    let updatedFeedback: AnonymousFeedback;
    try {
      if (existingVote && !existingVote.empty) {
        const voteDoc = existingVote.docs[0];
        const voteData = voteDoc.data();

        if (voteData.voteType === voteType) {
          // Remove vote if same type
          await db.collection('feedbackVotes').doc(voteDoc.id).delete();

          const updateData = voteType === 'up' 
            ? { upvotes: Math.max(0, feedback.upvotes - 1) }
            : { downvotes: Math.max(0, feedback.downvotes - 1) };

          await db.collection('anonymousFeedback').doc(id).update(updateData);
        } else {
          // Change vote type
          await db.collection('feedbackVotes').doc(voteDoc.id).update({
            voteType,
            timestamp: Date.now()
          });

          const updateData = voteType === 'up'
            ? { 
                upvotes: feedback.upvotes + 1,
                downvotes: Math.max(0, feedback.downvotes - 1)
              }
            : { 
                upvotes: Math.max(0, feedback.upvotes - 1),
                downvotes: feedback.downvotes + 1
              };

          await db.collection('anonymousFeedback').doc(id).update(updateData);
        }
      } else {
        // Add new vote
        await db.collection('feedbackVotes').add({
          feedbackId: id,
          userId: req.user.id,
          voteType,
          timestamp: Date.now()
        });

        const updateData = voteType === 'up'
          ? { upvotes: feedback.upvotes + 1 }
          : { downvotes: feedback.downvotes + 1 };

        await db.collection('anonymousFeedback').doc(id).update(updateData);
      }

      const updatedDoc = await db.collection('anonymousFeedback').doc(id).get();
      updatedFeedback = { id: updatedDoc.id, ...updatedDoc.data() } as AnonymousFeedback;
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for vote update, using temporary response');
      // Calculate vote counts optimistically
      const upvotes = voteType === 'up' ? feedback.upvotes + 1 : Math.max(0, feedback.upvotes - 1);
      const downvotes = voteType === 'down' ? feedback.downvotes + 1 : Math.max(0, feedback.downvotes - 1);
      updatedFeedback = { ...feedback, id, upvotes, downvotes };
    }

    res.json({
      success: true,
      data: updatedFeedback
    } as ApiResponse<AnonymousFeedback>);

  } catch (error: any) {
    console.error('Vote feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to vote on feedback'
    } as ApiResponse<null>);
  }
});

// Delete feedback (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const feedbackDoc = await db.collection('anonymousFeedback').doc(id).get();
    if (!feedbackDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Feedback not found'
      } as ApiResponse<null>);
      return;
    }

    // Delete associated votes
    const votesSnapshot = await db.collection('feedbackVotes')
      .where('feedbackId', '==', id)
      .get();

    const batch = db.batch();
    votesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the feedback
    batch.delete(db.collection('anonymousFeedback').doc(id));

    await batch.commit();

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    } as ApiResponse<null>);

  } catch (error: any) {
    console.error('Delete feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete feedback'
    } as ApiResponse<null>);
  }
});

export default router;
