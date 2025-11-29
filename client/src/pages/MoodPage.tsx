import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { apiService } from '../services/api';
import type { MoodEntry } from '@shared/types';

const moods: { id: MoodEntry['mood']; label: string; description: string }[] = [
  { id: 'stressed', label: '😣 Stressed', description: 'Overloaded or under pressure' },
  { id: 'tired', label: '😴 Tired', description: 'Low energy, hard to focus' },
  { id: 'motivated', label: '💪 Motivated', description: 'Ready to crush your tasks' },
  { id: 'happy', label: '😊 Happy', description: 'In a good mood' },
  { id: 'anxious', label: '😟 Anxious', description: 'Worried about studies or life' },
  { id: 'focused', label: '🎯 Focused', description: 'In the zone for deep work' },
];

const MoodPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedMood, setSelectedMood] = useState<MoodEntry['mood'] | null>(null);

  const entriesQuery = useQuery({
    queryKey: ['mood', 'entries'],
    queryFn: async () => {
      const res = await apiService.mood.getEntries({ limit: 10 });
      return res.data.data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['mood', 'stats'],
    queryFn: async () => {
      const res = await apiService.mood.getStats({ days: 30 });
      return res.data.data;
    },
  });

  const createMoodMutation = useMutation({
    mutationFn: (mood: MoodEntry['mood']) => apiService.mood.create(mood),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood', 'entries'] });
      queryClient.invalidateQueries({ queryKey: ['mood', 'stats'] });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      apiService.mood.feedback(id, helpful),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood', 'entries'] });
      queryClient.invalidateQueries({ queryKey: ['mood', 'stats'] });
    },
  });

  const handleSelectMood = (mood: MoodEntry['mood']) => {
    setSelectedMood(mood);
    createMoodMutation.mutate(mood);
  };

  const latestEntry = entriesQuery.data?.data?.[0] as MoodEntry | undefined;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Mood Tracker</h1>
        <p className="text-gray-600">
          Log how you&apos;re feeling and get AI-powered study tips tailored to your mood.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mood selector + current tip */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How are you feeling today?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {moods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMood(m.id)}
                    disabled={createMoodMutation.isPending}
                    className={`flex items-start rounded-lg border p-3 text-left transition ${
                      selectedMood === m.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl mr-3">{m.label.split(' ')[0]}</span>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{m.label.split(' ').slice(1).join(' ')}</p>
                      <p className="text-xs text-gray-500">{m.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {createMoodMutation.isPending && (
                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating a study tip for you...
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest Study Tip</CardTitle>
            </CardHeader>
            <CardContent>
              {entriesQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : latestEntry ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Mood:{' '}
                    <span className="font-medium capitalize">
                      {latestEntry.mood}
                    </span>
                  </p>
                  <p className="text-gray-900 leading-relaxed">{latestEntry.studyTip}</p>
                  <div className="flex items-center space-x-3 pt-2">
                    <span className="text-xs text-gray-500">Was this helpful?</span>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={feedbackMutation.isPending}
                      onClick={() =>
                        feedbackMutation.mutate({ id: latestEntry.id, helpful: true })
                      }
                    >
                      👍 Yes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={feedbackMutation.isPending}
                      onClick={() =>
                        feedbackMutation.mutate({ id: latestEntry.id, helpful: false })
                      }
                    >
                      👎 Not really
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  You haven&apos;t logged any moods yet. Select how you&apos;re feeling above to
                  get your first tip.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              {statsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : statsQuery.data?.data ? (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total entries</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {statsQuery.data.data.totalEntries}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Most common mood</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {statsQuery.data.data.mostCommonMood}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Helpful tips rate</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {statsQuery.data.data.tipHelpfulnessRate.toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Mood distribution</p>
                    <ul className="space-y-1">
                      {Object.entries(statsQuery.data.data.moodDistribution).map(
                        ([mood, count]) => (
                          <li key={mood} className="flex justify-between">
                            <span className="capitalize text-gray-700">{mood}</span>
                            <span className="text-gray-900 font-medium">{count}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No mood data yet. Start tracking to see your stats over time.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MoodPage;
