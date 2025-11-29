import express from 'express';
import { db } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { CampusStatus, ApiResponse } from '../../../shared/types';

const router = express.Router();

// Get all campus status updates
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const facility = req.query.facility as string;
    const keyword = req.query.keyword as string;

    let query = db.collection('campusStatus').orderBy('lastUpdated', 'desc');

    // Filter by facility if provided
    if (facility) {
      query = query.where('facility', '==', facility);
    }

    const statusSnapshot = await query.get();
    let statuses: CampusStatus[] = [];

    statusSnapshot.forEach(doc => {
      statuses.push({ id: doc.id, ...doc.data() } as CampusStatus);
    });

    // Filter by keyword if provided
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      statuses = statuses.filter(status => 
        status.keywords.some(k => k.toLowerCase().includes(keywordLower)) ||
        status.facility.toLowerCase().includes(keywordLower) ||
        status.description.toLowerCase().includes(keywordLower)
      );
    }

    res.json({
      success: true,
      data: statuses
    } as ApiResponse<CampusStatus[]>);

  } catch (error: any) {
    console.error('Get campus status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campus status'
    } as ApiResponse<null>);
  }
});

// Get status by facility name or keyword
router.get('/search/:query', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { query } = req.params;
    const queryLower = query.toLowerCase();

    const statusSnapshot = await db.collection('campusStatus').get();
    const matchingStatuses: CampusStatus[] = [];

    statusSnapshot.forEach(doc => {
      const status = { id: doc.id, ...doc.data() } as CampusStatus;
      
      // Check if query matches facility name, keywords, or description
      if (
        status.facility.toLowerCase().includes(queryLower) ||
        status.keywords.some(k => k.toLowerCase().includes(queryLower)) ||
        status.description.toLowerCase().includes(queryLower)
      ) {
        matchingStatuses.push(status);
      }
    });

    // Sort by last updated
    matchingStatuses.sort((a, b) => b.lastUpdated - a.lastUpdated);

    res.json({
      success: true,
      data: matchingStatuses
    } as ApiResponse<CampusStatus[]>);

  } catch (error: any) {
    console.error('Search campus status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search campus status'
    } as ApiResponse<null>);
  }
});

// Get status by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const statusDoc = await db.collection('campusStatus').doc(id).get();
    if (!statusDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Campus status not found'
      } as ApiResponse<null>);
      return;
    }

    const status = { id: statusDoc.id, ...statusDoc.data() } as CampusStatus;

    res.json({
      success: true,
      data: status
    } as ApiResponse<CampusStatus>);

  } catch (error: any) {
    console.error('Get campus status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campus status'
    } as ApiResponse<null>);
  }
});

// Create or update campus status
router.post('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { facility, status, description, keywords } = req.body;

    if (!facility || !status || !description) {
      res.status(400).json({
        success: false,
        error: 'Facility, status, and description are required'
      } as ApiResponse<null>);
      return;
    }

    const validStatuses = ['available', 'busy', 'closed', 'maintenance'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Status must be one of: available, busy, closed, maintenance'
      } as ApiResponse<null>);
      return;
    }

    // Check if status for this facility already exists
    const existingStatusSnapshot = await db.collection('campusStatus')
      .where('facility', '==', facility.trim())
      .get();

    const statusData: Omit<CampusStatus, 'id'> = {
      facility: facility.trim(),
      status,
      description: description.trim(),
      lastUpdated: Date.now(),
      updatedBy: req.user.id,
      keywords: keywords || []
    };

    let campusStatus: CampusStatus;

    if (!existingStatusSnapshot.empty) {
      // Update existing status
      const existingDoc = existingStatusSnapshot.docs[0];
      await db.collection('campusStatus').doc(existingDoc.id).update(statusData);
      campusStatus = { id: existingDoc.id, ...statusData };
    } else {
      // Create new status
      const docRef = await db.collection('campusStatus').add(statusData);
      campusStatus = { id: docRef.id, ...statusData };
    }

    // Award points to user for updating status
    await db.collection('users').doc(req.user.id).update({
      points: req.user.points + 3
    });

    res.status(201).json({
      success: true,
      data: campusStatus
    } as ApiResponse<CampusStatus>);

  } catch (error: any) {
    console.error('Create/update campus status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/update campus status'
    } as ApiResponse<null>);
  }
});

// Update existing campus status
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
    const { status, description, keywords } = req.body;

    const statusDoc = await db.collection('campusStatus').doc(id).get();
    if (!statusDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Campus status not found'
      } as ApiResponse<null>);
      return;
    }

    const updateData: Partial<CampusStatus> = {
      lastUpdated: Date.now(),
      updatedBy: req.user.id
    };

    if (status) {
      const validStatuses = ['available', 'busy', 'closed', 'maintenance'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status must be one of: available, busy, closed, maintenance'
        } as ApiResponse<null>);
        return;
      }
      updateData.status = status;
    }

    if (description) updateData.description = description.trim();
    if (keywords) updateData.keywords = keywords;

    await db.collection('campusStatus').doc(id).update(updateData);

    const updatedDoc = await db.collection('campusStatus').doc(id).get();
    const updatedStatus = { id: updatedDoc.id, ...updatedDoc.data() } as CampusStatus;

    // Award points to user for updating status
    await db.collection('users').doc(req.user.id).update({
      points: req.user.points + 3
    });

    res.json({
      success: true,
      data: updatedStatus
    } as ApiResponse<CampusStatus>);

  } catch (error: any) {
    console.error('Update campus status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campus status'
    } as ApiResponse<null>);
  }
});

// Delete campus status (admin only)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only admins can delete campus status'
      } as ApiResponse<null>);
      return;
    }

    const { id } = req.params;

    const statusDoc = await db.collection('campusStatus').doc(id).get();
    if (!statusDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Campus status not found'
      } as ApiResponse<null>);
      return;
    }

    await db.collection('campusStatus').doc(id).delete();

    res.json({
      success: true,
      message: 'Campus status deleted successfully'
    } as ApiResponse<null>);

  } catch (error: any) {
    console.error('Delete campus status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campus status'
    } as ApiResponse<null>);
  }
});

// Get popular keywords
router.get('/keywords/popular', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const statusSnapshot = await db.collection('campusStatus').get();
    const keywordCounts: Record<string, number> = {};

    statusSnapshot.forEach(doc => {
      const status = doc.data() as CampusStatus;
      status.keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        keywordCounts[keywordLower] = (keywordCounts[keywordLower] || 0) + 1;
      });
    });

    // Sort keywords by frequency
    const sortedKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([keyword, count]) => ({ keyword, count }));

    res.json({
      success: true,
      data: sortedKeywords
    } as ApiResponse<Array<{ keyword: string; count: number }>>);

  } catch (error: any) {
    console.error('Get popular keywords error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular keywords'
    } as ApiResponse<null>);
  }
});

export default router;
