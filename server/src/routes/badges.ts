import express from 'express';
import { db } from '../config/database';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth';
import { Badge, UserActivity, ApiResponse } from '../../../shared/types';

const router = express.Router();

// Get all available badges
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const badgesSnapshot = await db.collection('badges').orderBy('category').get();
    const badges: Badge[] = [];

    badgesSnapshot.forEach(doc => {
      badges.push({ id: doc.id, ...doc.data() } as Badge);
    });

    res.json({
      success: true,
      data: badges
    } as ApiResponse<Badge[]>);

  } catch (error: any) {
    console.error('Get badges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get badges'
    } as ApiResponse<null>);
  }
});

// Get user's badges
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { userId } = req.params;

    // Users can only view their own badges unless they're admin
    if (userId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only view your own badges'
      } as ApiResponse<null>);
      return;
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse<null>);
      return;
    }

    const userData = userDoc.data();
    const userBadges = userData?.badges || [];

    res.json({
      success: true,
      data: userBadges
    } as ApiResponse<Badge[]>);

  } catch (error: any) {
    console.error('Get user badges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user badges'
    } as ApiResponse<null>);
  }
});

// Create a new badge (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: express.Response) => {
  try {
    const { name, description, icon, category } = req.body;

    if (!name || !description || !icon || !category) {
      res.status(400).json({
        success: false,
        error: 'Name, description, icon, and category are required'
      } as ApiResponse<null>);
      return;
    }

    const validCategories = ['helper', 'social', 'academic', 'special'];
    if (!validCategories.includes(category)) {
      res.status(400).json({
        success: false,
        error: 'Category must be one of: helper, social, academic, special'
      } as ApiResponse<null>);
      return;
    }

    const badge: Omit<Badge, 'id' | 'earnedAt'> = {
      name: name.trim(),
      description: description.trim(),
      icon: icon.trim(),
      category,
      earnedAt: 0 // This will be set when awarded to users
    };

    const docRef = await db.collection('badges').add(badge);
    const newBadge: Badge = { id: docRef.id, ...badge, earnedAt: 0 };

    res.status(201).json({
      success: true,
      data: newBadge
    } as ApiResponse<Badge>);

  } catch (error: any) {
    console.error('Create badge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create badge'
    } as ApiResponse<null>);
  }
});

// Award badge to user (admin only)
router.post('/award', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: express.Response) => {
  try {
    const { userId, badgeId } = req.body;

    if (!userId || !badgeId) {
      res.status(400).json({
        success: false,
        error: 'User ID and badge ID are required'
      } as ApiResponse<null>);
      return;
    }

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse<null>);
      return;
    }

    // Check if badge exists
    const badgeDoc = await db.collection('badges').doc(badgeId).get();
    if (!badgeDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Badge not found'
      } as ApiResponse<null>);
      return;
    }

    const userData = userDoc.data();
    const badgeData = badgeDoc.data();
    const userBadges = userData?.badges || [];

    // Check if user already has this badge
    const hasBadge = userBadges.some((badge: Badge) => badge.id === badgeId);
    if (hasBadge) {
      res.status(400).json({
        success: false,
        error: 'User already has this badge'
      } as ApiResponse<null>);
      return;
    }

    // Create badge with earned timestamp
    const earnedBadge: Badge = {
      id: badgeId,
      name: badgeData?.name,
      description: badgeData?.description,
      icon: badgeData?.icon,
      category: badgeData?.category,
      earnedAt: Date.now()
    };

    // Add badge to user's badges array
    const updatedBadges = [...userBadges, earnedBadge];
    await db.collection('users').doc(userId).update({
      badges: updatedBadges,
      points: (userData?.points || 0) + 20 // Award points for earning badge
    });

    // Log the activity
    const activity: Omit<UserActivity, 'id'> = {
      userId,
      type: 'badge_earned',
      description: `Earned badge: ${badgeData?.name}`,
      points: 20,
      timestamp: Date.now()
    };

    await db.collection('userActivities').add(activity);

    res.json({
      success: true,
      data: earnedBadge,
      message: 'Badge awarded successfully'
    } as ApiResponse<Badge>);

  } catch (error: any) {
    console.error('Award badge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to award badge'
    } as ApiResponse<null>);
  }
});

// Check and award automatic badges based on user activity
router.post('/check-automatic', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const userId = req.user.id;
    const newBadges: Badge[] = [];

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userBadges = userData?.badges || [];
    const userPoints = userData?.points || 0;

    // Get user activities
    const activitiesSnapshot = await db.collection('userActivities')
      .where('userId', '==', userId)
      .get();

    const activities: UserActivity[] = [];
    activitiesSnapshot.forEach(doc => {
      activities.push({ id: doc.id, ...doc.data() } as UserActivity);
    });

    // Define automatic badge criteria
    const badgeCriteria = [
      {
        id: 'first-message',
        name: 'First Message',
        description: 'Sent your first message in chat',
        icon: '💬',
        category: 'social',
        condition: () => activities.some(a => a.type === 'message')
      },
      {
        id: 'helpful-finder',
        name: 'Helpful Finder',
        description: 'Reported 5 lost or found items',
        icon: '🔍',
        category: 'helper',
        condition: () => activities.filter(a => a.type === 'lost_found').length >= 5
      },
      {
        id: 'mood-tracker',
        name: 'Mood Tracker',
        description: 'Tracked your mood 10 times',
        icon: '😊',
        category: 'academic',
        condition: () => activities.filter(a => a.type === 'mood_entry').length >= 10
      },
      {
        id: 'status-updater',
        name: 'Status Updater',
        description: 'Updated campus status 5 times',
        icon: '📍',
        category: 'helper',
        condition: () => activities.filter(a => a.type === 'status_update').length >= 5
      },
      {
        id: 'point-collector',
        name: 'Point Collector',
        description: 'Earned 100 points',
        icon: '⭐',
        category: 'special',
        condition: () => userPoints >= 100
      },
      {
        id: 'super-contributor',
        name: 'Super Contributor',
        description: 'Earned 500 points',
        icon: '🏆',
        category: 'special',
        condition: () => userPoints >= 500
      }
    ];

    // Check each badge criteria
    for (const criteria of badgeCriteria) {
      const hasBadge = userBadges.some((badge: Badge) => badge.id === criteria.id);
      
      if (!hasBadge && criteria.condition()) {
        // Create the badge if it doesn't exist in the badges collection
        const existingBadgeDoc = await db.collection('badges').doc(criteria.id).get();
        if (!existingBadgeDoc.exists) {
          await db.collection('badges').doc(criteria.id).set({
            name: criteria.name,
            description: criteria.description,
            icon: criteria.icon,
            category: criteria.category
          });
        }

        // Award the badge
        const earnedBadge: Badge = {
          id: criteria.id,
          name: criteria.name,
          description: criteria.description,
          icon: criteria.icon,
          category: criteria.category,
          earnedAt: Date.now()
        };

        newBadges.push(earnedBadge);
      }
    }

    // Update user with new badges
    if (newBadges.length > 0) {
      const updatedBadges = [...userBadges, ...newBadges];
      const bonusPoints = newBadges.length * 20;

      await db.collection('users').doc(userId).update({
        badges: updatedBadges,
        points: userPoints + bonusPoints
      });

      // Log activities for new badges
      for (const badge of newBadges) {
        const activity: Omit<UserActivity, 'id'> = {
          userId,
          type: 'badge_earned',
          description: `Earned badge: ${badge.name}`,
          points: 20,
          timestamp: Date.now()
        };

        await db.collection('userActivities').add(activity);
      }
    }

    res.json({
      success: true,
      data: newBadges,
      message: newBadges.length > 0 ? `Earned ${newBadges.length} new badge(s)!` : 'No new badges earned'
    } as ApiResponse<Badge[]>);

  } catch (error: any) {
    console.error('Check automatic badges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check automatic badges'
    } as ApiResponse<null>);
  }
});

// Get user activities
router.get('/activities/:userId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    // Users can only view their own activities unless they're admin
    if (userId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only view your own activities'
      } as ApiResponse<null>);
      return;
    }

    const activitiesSnapshot = await db.collection('userActivities')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const activities: UserActivity[] = [];
    activitiesSnapshot.forEach(doc => {
      activities.push({ id: doc.id, ...doc.data() } as UserActivity);
    });

    res.json({
      success: true,
      data: activities
    } as ApiResponse<UserActivity[]>);

  } catch (error: any) {
    console.error('Get user activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user activities'
    } as ApiResponse<null>);
  }
});

export default router;
