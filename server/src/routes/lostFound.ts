import express from 'express';
import { db } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { LostFoundItem, ApiResponse, PaginatedResponse } from '../../../shared/types';

const router = express.Router();

// Get all lost and found items with pagination and filtering
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const category = req.query.category as string;
    const search = req.query.search as string;

    let items: LostFoundItem[] = [];
    
    try {
      let query = db.collection('lostFoundItems').orderBy('timestamp', 'desc');

      // Apply filters
      if (status) {
        query = query.where('status', '==', status);
      }
      if (category) {
        query = query.where('category', '==', category);
      }

      // Get total count
      const totalSnapshot = await query.get();
      items = totalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LostFoundItem));
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for lost & found items, returning empty list');
      items = [];
    }

    // Apply search filter (client-side for simplicity)
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.location.toLowerCase().includes(searchLower)
      );
    }

    const total = items.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    const response: PaginatedResponse<LostFoundItem> = {
      data: paginatedItems,
      total,
      page,
      limit,
      hasMore: offset + limit < total
    };

    res.json({
      success: true,
      data: response
    } as ApiResponse<PaginatedResponse<LostFoundItem>>);

  } catch (error: any) {
    console.error('Get lost found items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lost and found items'
    } as ApiResponse<null>);
  }
});

// Get lost and found item by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    let itemDoc;
    try {
      itemDoc = await db.collection('lostFoundItems').doc(id).get();
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for getting item');
      res.status(503).json({
        success: false,
        error: 'Server temporarily unavailable'
      } as ApiResponse<null>);
      return;
    }

    if (!itemDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Item not found'
      } as ApiResponse<null>);
      return;
    }

    const item = { id: itemDoc.id, ...itemDoc.data() } as LostFoundItem;

    res.json({
      success: true,
      data: item
    } as ApiResponse<LostFoundItem>);

  } catch (error: any) {
    console.error('Get lost found item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get item'
    } as ApiResponse<null>);
  }
});

// Report a lost or found item
router.post('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { title, description, category, status, location, contactInfo, imageUrl } = req.body;

    if (!title || !description || !category || !status || !location || !contactInfo) {
      res.status(400).json({
        success: false,
        error: 'Title, description, category, status, location, and contact info are required'
      } as ApiResponse<null>);
      return;
    }

    if (!['lost', 'found'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Status must be either "lost" or "found"'
      } as ApiResponse<null>);
      return;
    }

    const validCategories = ['electronics', 'clothing', 'books', 'accessories', 'documents', 'other'];
    if (!validCategories.includes(category)) {
      res.status(400).json({
        success: false,
        error: 'Invalid category'
      } as ApiResponse<null>);
      return;
    }

    const item: Omit<LostFoundItem, 'id'> = {
      title: title.trim(),
      description: description.trim(),
      category,
      status,
      reporterId: req.user.id,
      reporterName: req.user.name,
      location: location.trim(),
      contactInfo: contactInfo.trim(),
      imageUrl: imageUrl || undefined,
      timestamp: Date.now()
    };

    let newItem: LostFoundItem;
    try {
      const docRef = await db.collection('lostFoundItems').add(item);
      newItem = { id: docRef.id, ...item };

      // Award points to user for reporting
      try {
        await db.collection('users').doc(req.user.id).update({
          points: req.user.points + 5
        });
      } catch (pointsError) {
        console.warn('⚠️ Could not update user points:', pointsError);
      }
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable, using temporary ID');
      newItem = { id: `temp_lf_${Date.now()}_${Math.random()}`, ...item };
    }

    res.status(201).json({
      success: true,
      data: newItem
    } as ApiResponse<LostFoundItem>);

  } catch (error: any) {
    console.error('Report item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report item'
    } as ApiResponse<null>);
  }
});

// Update lost and found item
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
    const { title, description, category, location, contactInfo, imageUrl } = req.body;

    let itemDoc;
    try {
      itemDoc = await db.collection('lostFoundItems').doc(id).get();
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for update');
      res.status(503).json({
        success: false,
        error: 'Server temporarily unavailable'
      } as ApiResponse<null>);
      return;
    }

    if (!itemDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Item not found'
      } as ApiResponse<null>);
      return;
    }

    const itemData = itemDoc.data() as LostFoundItem;

    // Check if user owns the item or is admin
    if (itemData.reporterId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only edit your own reports'
      } as ApiResponse<null>);
      return;
    }

    const updateData: Partial<LostFoundItem> = {};
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (category) updateData.category = category;
    if (location) updateData.location = location.trim();
    if (contactInfo) updateData.contactInfo = contactInfo.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    let updatedItem: LostFoundItem;
    try {
      await db.collection('lostFoundItems').doc(id).update(updateData);
      const updatedDoc = await db.collection('lostFoundItems').doc(id).get();
      updatedItem = { id: updatedDoc.id, ...updatedDoc.data() } as LostFoundItem;
    } catch (firestoreError) {
      console.warn('⚠️ Firestore unavailable for update, using temporary response');
      updatedItem = { ...itemData, id, ...updateData } as LostFoundItem;
    }

    res.json({
      success: true,
      data: updatedItem
    } as ApiResponse<LostFoundItem>);

  } catch (error: any) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update item'
    } as ApiResponse<null>);
  }
});

// Mark item as returned
router.post('/:id/return', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { id } = req.params;

    const itemDoc = await db.collection('lostFoundItems').doc(id).get();
    if (!itemDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Item not found'
      } as ApiResponse<null>);
      return;
    }

    const itemData = itemDoc.data() as LostFoundItem;

    if (itemData.status === 'returned') {
      res.status(400).json({
        success: false,
        error: 'Item is already marked as returned'
      } as ApiResponse<null>);
      return;
    }

    await db.collection('lostFoundItems').doc(id).update({
      status: 'returned',
      resolvedAt: Date.now(),
      resolvedBy: req.user.id
    });

    // Award points to both reporter and resolver
    const pointsToAward = 10;
    
    // Award points to reporter
    const reporterDoc = await db.collection('users').doc(itemData.reporterId).get();
    if (reporterDoc.exists) {
      const reporterData = reporterDoc.data();
      await db.collection('users').doc(itemData.reporterId).update({
        points: (reporterData?.points || 0) + pointsToAward
      });
    }

    // Award points to resolver (if different from reporter)
    if (req.user.id !== itemData.reporterId) {
      await db.collection('users').doc(req.user.id).update({
        points: req.user.points + pointsToAward
      });
    }

    const updatedDoc = await db.collection('lostFoundItems').doc(id).get();
    const updatedItem = { id: updatedDoc.id, ...updatedDoc.data() } as LostFoundItem;

    res.json({
      success: true,
      data: updatedItem
    } as ApiResponse<LostFoundItem>);

  } catch (error: any) {
    console.error('Mark returned error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark item as returned'
    } as ApiResponse<null>);
  }
});

// Delete lost and found item
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

    const itemDoc = await db.collection('lostFoundItems').doc(id).get();
    if (!itemDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Item not found'
      } as ApiResponse<null>);
      return;
    }

    const itemData = itemDoc.data() as LostFoundItem;

    // Check if user owns the item or is admin
    if (itemData.reporterId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only delete your own reports'
      } as ApiResponse<null>);
      return;
    }

    await db.collection('lostFoundItems').doc(id).delete();

    res.json({
      success: true,
      message: 'Item deleted successfully'
    } as ApiResponse<null>);

  } catch (error: any) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    } as ApiResponse<null>);
  }
});

export default router;
