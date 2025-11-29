import express from 'express';
import { db } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { MoodEntry, ApiResponse, PaginatedResponse } from '../../../shared/types';
// Note: Gemini API import removed - using curated study tips for demo

const router = express.Router();

// Get mood entries for a user
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.query.userId as string || req.user.id;

    // Users can only view their own mood entries unless they're admin
    if (userId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only view your own mood entries'
      } as ApiResponse<null>);
      return;
    }

    let query = db.collection('moodEntries')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc');

    // Get total count
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Apply pagination
    const offset = (page - 1) * limit;
    const entriesSnapshot = await query.offset(offset).limit(limit).get();

    const entries: MoodEntry[] = [];
    entriesSnapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() } as MoodEntry);
    });

    const response: PaginatedResponse<MoodEntry> = {
      data: entries,
      total,
      page,
      limit,
      hasMore: offset + limit < total
    };

    res.json({
      success: true,
      data: response
    } as ApiResponse<PaginatedResponse<MoodEntry>>);

  } catch (error: any) {
    console.error('Get mood entries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mood entries'
    } as ApiResponse<null>);
  }
});

// Create a new mood entry with AI-generated study tip
router.post('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { mood } = req.body;

    const validMoods = ['stressed', 'tired', 'motivated', 'happy', 'anxious', 'focused'];
    if (!mood || !validMoods.includes(mood)) {
      res.status(400).json({
        success: false,
        error: 'Valid mood is required (stressed, tired, motivated, happy, anxious, focused)'
      } as ApiResponse<null>);
      return;
    }

    // Generate study tip based on mood (using placeholder tips for demo)
    // In production, this would use Gemini API, but for demo purposes we use curated tips
    const studyTip = getDefaultStudyTip(mood);

    const moodEntry: Omit<MoodEntry, 'id'> = {
      userId: req.user.id,
      mood,
      studyTip,
      timestamp: Date.now()
    };

    const docRef = await db.collection('moodEntries').add(moodEntry);
    const newEntry: MoodEntry = { id: docRef.id, ...moodEntry };

    // Award points for mood tracking
    await db.collection('users').doc(req.user.id).update({
      points: req.user.points + 2
    });

    res.status(201).json({
      success: true,
      data: newEntry
    } as ApiResponse<MoodEntry>);

  } catch (error: any) {
    console.error('Create mood entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create mood entry'
    } as ApiResponse<null>);
  }
});

// Mark study tip as helpful/not helpful
router.post('/:id/feedback', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { id } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Helpful field must be a boolean'
      } as ApiResponse<null>);
      return;
    }

    const entryDoc = await db.collection('moodEntries').doc(id).get();
    if (!entryDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Mood entry not found'
      } as ApiResponse<null>);
      return;
    }

    const entryData = entryDoc.data() as MoodEntry;

    // Check if user owns the mood entry
    if (entryData.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'You can only provide feedback on your own mood entries'
      } as ApiResponse<null>);
      return;
    }

    await db.collection('moodEntries').doc(id).update({ helpful });

    const updatedDoc = await db.collection('moodEntries').doc(id).get();
    const updatedEntry = { id: updatedDoc.id, ...updatedDoc.data() } as MoodEntry;

    res.json({
      success: true,
      data: updatedEntry
    } as ApiResponse<MoodEntry>);

  } catch (error: any) {
    console.error('Mood feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    } as ApiResponse<null>);
  }
});

// Get mood statistics for a user
router.get('/stats', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const userId = req.query.userId as string || req.user.id;
    const days = parseInt(req.query.days as string) || 30;

    // Users can only view their own stats unless they're admin
    if (userId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only view your own mood statistics'
      } as ApiResponse<null>);
      return;
    }

    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    const entriesSnapshot = await db.collection('moodEntries')
      .where('userId', '==', userId)
      .where('timestamp', '>=', startTime)
      .get();

    const moodCounts: Record<string, number> = {};
    let totalEntries = 0;
    let helpfulTips = 0;
    let totalTipsRated = 0;

    entriesSnapshot.forEach(doc => {
      const entry = doc.data() as MoodEntry;
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      totalEntries++;

      if (entry.helpful !== undefined) {
        totalTipsRated++;
        if (entry.helpful) {
          helpfulTips++;
        }
      }
    });

    const stats = {
      totalEntries,
      moodDistribution: moodCounts,
      mostCommonMood: Object.keys(moodCounts).reduce((a, b) => 
        moodCounts[a] > moodCounts[b] ? a : b, 'none'
      ),
      tipHelpfulnessRate: totalTipsRated > 0 ? (helpfulTips / totalTipsRated) * 100 : 0,
      period: `${days} days`
    };

    res.json({
      success: true,
      data: stats
    } as ApiResponse<typeof stats>);

  } catch (error: any) {
    console.error('Get mood stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mood statistics'
    } as ApiResponse<null>);
  }
});

// Delete mood entry
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

    const entryDoc = await db.collection('moodEntries').doc(id).get();
    if (!entryDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Mood entry not found'
      } as ApiResponse<null>);
      return;
    }

    const entryData = entryDoc.data() as MoodEntry;

    // Check if user owns the mood entry or is admin
    if (entryData.userId !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'You can only delete your own mood entries'
      } as ApiResponse<null>);
      return;
    }

    await db.collection('moodEntries').doc(id).delete();

    res.json({
      success: true,
      message: 'Mood entry deleted successfully'
    } as ApiResponse<null>);

  } catch (error: any) {
    console.error('Delete mood entry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete mood entry'
    } as ApiResponse<null>);
  }
});

// Helper function for default study tips
function getDefaultStudyTip(mood: string): string {
  const tips: Record<string, string> = {
    stressed: "Take deep breaths and break your study session into smaller, manageable chunks. Try the Pomodoro technique with 25-minute focused sessions.",
    tired: "Consider taking a short 10-15 minute power nap, or try some light exercise to boost your energy. Stay hydrated and avoid heavy meals.",
    motivated: "Great! Use this energy to tackle your most challenging subjects first. Set clear goals for this study session and reward yourself when you achieve them.",
    happy: "Channel this positive energy into collaborative learning. Consider studying with friends or teaching concepts to others to reinforce your understanding.",
    anxious: "Start with easier topics to build confidence, then gradually move to more challenging material. Practice mindfulness or meditation before studying.",
    focused: "Perfect! This is an ideal time for deep work. Eliminate distractions, put your phone away, and dive into complex problem-solving or detailed reading."
  };

  return tips[mood] || "Remember to take regular breaks, stay hydrated, and maintain a positive mindset while studying.";
}

export default router;
