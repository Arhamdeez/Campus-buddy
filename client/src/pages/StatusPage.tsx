import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { CampusStatus } from '@shared/types';

const statusColor: Record<CampusStatus['status'], string> = {
  available: 'bg-green-100 text-green-800',
  busy: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-red-100 text-red-800',
  maintenance: 'bg-orange-100 text-orange-800',
};

const StatusPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [facility, setFacility] = useState('');
  const [status, setStatus] = useState<CampusStatus['status']>('available');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'society_head';

  const statusQuery = useQuery({
    queryKey: ['status', 'list', searchQuery],
    queryFn: async () => {
      if (searchQuery.trim()) {
        const res = await apiService.status.search(searchQuery.trim());
        return res.data.data as CampusStatus[];
      }
      const res = await apiService.status.getAll();
      return res.data.data as CampusStatus[];
    },
  });

  const popularKeywordsQuery = useQuery({
    queryKey: ['status', 'keywords'],
    queryFn: async () => {
      const res = await apiService.status.getPopularKeywords(8);
      return res.data.data as Array<{ keyword: string; count: number }>;
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        facility,
        status,
        description,
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      };
      return apiService.status.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['status', 'keywords'] });
      setFacility('');
      setDescription('');
      setKeywords('');
    },
  });

  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Campus Status</h1>
        <p className="text-gray-600">
          Search real-time updates for facilities like cafeteria, parking, library, and more.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search + results */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search facility status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <Input
                  label="What are you looking for?"
                  placeholder="e.g. parking, cafeteria, library"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button
                  className="sm:w-auto w-full"
                  variant="primary"
                  onClick={() => statusQuery.refetch()}
                  loading={statusQuery.isFetching}
                >
                  Search
                </Button>
              </div>

              {popularKeywordsQuery.data && popularKeywordsQuery.data.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Popular keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {popularKeywordsQuery.data.map(({ keyword }) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => handleKeywordClick(keyword)}
                        className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700 hover:bg-primary-100 hover:text-primary-700 transition"
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest updates</CardTitle>
            </CardHeader>
            <CardContent>
              {statusQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : statusQuery.data && statusQuery.data.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {statusQuery.data.map((s) => (
                    <li key={s.id} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{s.facility}</h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[s.status]}`}
                          >
                            {s.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                        {s.keywords && s.keywords.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.keywords.map((k) => (
                              <span
                                key={k}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                              >
                                #{k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(s.lastUpdated).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  No status updates yet. Try another keyword or ask an admin to add statuses.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin update form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {isAdmin ? 'Update facility status' : 'How it works'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!facility || !description) return;
                    createOrUpdateMutation.mutate();
                  }}
                >
                  <Input
                    label="Facility name"
                    placeholder="e.g. Main Cafeteria"
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                  />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      className="input"
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as CampusStatus['status'])
                      }
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="closed">Closed</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      className="input min-h-[80px]"
                      placeholder="Short description, e.g. 'Lunch rush, long queues at peak hours'."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <Input
                    label="Keywords (comma separated)"
                    placeholder="e.g. cafeteria, food, lunch"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    helperText="Used to make search more accurate (e.g. parking, gate 3, basement)"
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    loading={createOrUpdateMutation.isPending}
                  >
                    Save status
                  </Button>
                </form>
              ) : (
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    Campus status updates are maintained by administrators and society
                    heads. They can update real-time information about:
                  </p>
                  <ul className="list-disc list-inside text-gray-600">
                    <li>Cafeteria crowd levels</li>
                    <li>Parking availability</li>
                    <li>Library seats and timings</li>
                    <li>Lab, sports complex, and other facilities</li>
                  </ul>
                  <p className="text-xs text-gray-400 mt-2">
                    Tip: Use the search box and popular keywords to quickly find what you
                    need.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;
