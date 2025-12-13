import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  CheckCircle,
  Filter,
  MapPin,
  Navigation,
  Plus,
  Search,
  Target,
  Trophy,
  Users,
} from 'lucide-react';

import type { DropZone, DropZoneCreate, DropZoneDetails, DropZoneStatus } from '@/types/dropzones';
import {
  useCheckInToDropZone,
  useCreateDropZone,
  useDropZoneDetails,
  useDropZones,
  useJoinDropZone,
} from '@/hooks/useDropZones';

type StatusFilter = 'all' | DropZoneStatus;

function formatDateTime(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DropzonesPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [checkInLocation, setCheckInLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [checkInMessage, setCheckInMessage] = useState('');

  const [createForm, setCreateForm] = useState<DropZoneCreate & { tagsText?: string }>(
    () => ({
      name: '',
      description: '',
      center_lat: 0,
      center_lng: 0,
      radius_meters: 100,
      check_in_radius: 50,
      rules: '',
      tags: [],
      tagsText: '',
      is_public: true,
    })
  );

  const {
    data: dropzones,
    isLoading: zonesLoading,
    isError: zonesIsError,
    error: zonesError,
    refetch: refetchZones,
  } = useDropZones({ active: true });

  const {
    data: zoneDetails,
    isLoading: detailsLoading,
    isError: detailsIsError,
    error: detailsError,
    refetch: refetchDetails,
  } = useDropZoneDetails(selectedZoneId || '', { enabled: !!selectedZoneId });

  const createZone = useCreateDropZone({
    onSuccess: () => {
      setShowCreateDialog(false);
      setCreateForm({
        name: '',
        description: '',
        center_lat: 0,
        center_lng: 0,
        radius_meters: 100,
        check_in_radius: 50,
        rules: '',
        tags: [],
        tagsText: '',
        is_public: true,
      });
    },
  });

  const joinZone = useJoinDropZone();
  const checkIn = useCheckInToDropZone();

  const filteredZones = useMemo(() => {
    const list = dropzones ?? [];
    const q = searchTerm.trim().toLowerCase();

    return list.filter((z) => {
      const matchesSearch = !q || z.name.toLowerCase().includes(q) || (z.description ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' ? true : z.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dropzones, searchTerm, statusFilter]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCheckInLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        toast.success('Location acquired');
      },
      (error) => {
        toast.error('Unable to get your location');
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const canCheckIn = (zone: DropZoneDetails) => {
    if (!checkInLocation) return false;
    const distance = haversineDistanceMeters(
      checkInLocation.lat,
      checkInLocation.lng,
      zone.center_lat,
      zone.center_lng
    );
    return distance <= zone.check_in_radius;
  };

  const onSubmitCreate = () => {
    const tags = (createForm.tagsText || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: DropZoneCreate = {
      name: createForm.name,
      description: createForm.description || undefined,
      center_lat: createForm.center_lat,
      center_lng: createForm.center_lng,
      radius_meters: createForm.radius_meters,
      check_in_radius: createForm.check_in_radius,
      rules: createForm.rules || undefined,
      tags: tags.length ? tags : undefined,
      is_public: createForm.is_public ?? true,
    };

    createZone.mutate(payload);
  };

  const onSubmitCheckIn = () => {
    if (!selectedZoneId || !checkInLocation) {
      toast.error('Location required for check-in');
      return;
    }

    checkIn.mutate({
      dropzoneId: selectedZoneId,
      data: {
        lat: checkInLocation.lat,
        lng: checkInLocation.lng,
        message: checkInMessage || undefined,
      },
    });

    setShowCheckInDialog(false);
    setCheckInMessage('');
  };

  if (zonesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Drop Zones</h1>
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (zonesIsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Drop Zones</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load drop zones</CardTitle>
            <CardDescription>{(zonesError as any)?.message ?? 'Unknown error'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetchZones()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Drop Zones</h1>
          <Badge variant="secondary" className="ml-2">
            {filteredZones.length}
          </Badge>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button leftIcon={<Plus className="h-4 w-4" />}>Create Zone</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Drop Zone</DialogTitle>
              <DialogDescription>Set up a new location-based gathering spot.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Zone Name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="SoHo meetup, Newbury pickup..."
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description ?? ''}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What’s this zone about?"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.000001"
                    value={createForm.center_lat}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, center_lat: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.000001"
                    value={createForm.center_lng}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, center_lng: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="radius">Zone Radius (m)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={createForm.radius_meters ?? 100}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, radius_meters: parseFloat(e.target.value) || 100 }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="checkin_radius">Check-in Radius (m)</Label>
                  <Input
                    id="checkin_radius"
                    type="number"
                    value={createForm.check_in_radius ?? 50}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, check_in_radius: parseFloat(e.target.value) || 50 }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rules">Rules (optional)</Label>
                <Textarea
                  id="rules"
                  value={createForm.rules ?? ''}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, rules: e.target.value }))}
                  placeholder="No resellers. Be respectful."
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={createForm.tagsText ?? ''}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, tagsText: e.target.value }))}
                  placeholder="sneakers, meetup, retail"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={onSubmitCreate}
                loading={createZone.isPending}
                disabled={!createForm.name || !createForm.center_lat || !createForm.center_lng}
              >
                Create Zone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search drop zones…"
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ENDED">Ended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {filteredZones.length === 0 ? (
        <EmptyState
          title="No drop zones found"
          description="Try clearing filters, or create the first zone in your area."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredZones.map((zone: DropZone) => (
            <Card key={zone.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{zone.name}</CardTitle>
                    {zone.description ? (
                      <CardDescription className="mt-1 line-clamp-2">{zone.description}</CardDescription>
                    ) : null}
                  </div>
                  <Badge variant={zone.status === 'ACTIVE' ? 'accent' : 'outline'}>{zone.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{zone.member_count} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <span>{zone.check_in_count} check-ins</span>
                  </div>
                </div>

                {(zone.starts_at || zone.ends_at) && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {zone.starts_at ? <div>Starts: {formatDateTime(zone.starts_at)}</div> : null}
                    {zone.ends_at ? <div>Ends: {formatDateTime(zone.ends_at)}</div> : null}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">{zone.radius_meters}m radius</div>
                  <Button size="sm" onClick={() => setSelectedZoneId(zone.id)}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details */}
      {selectedZoneId && (
        <Dialog open={!!selectedZoneId} onOpenChange={() => setSelectedZoneId(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {detailsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : detailsIsError ? (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Unable to load zone details</DialogTitle>
                  <DialogDescription>{(detailsError as any)?.message ?? 'Unknown error'}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => refetchDetails()}>
                    Retry
                  </Button>
                </DialogFooter>
              </div>
            ) : zoneDetails ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {zoneDetails.name}
                    <Badge variant={zoneDetails.status === 'ACTIVE' ? 'accent' : 'outline'}>{zoneDetails.status}</Badge>
                  </DialogTitle>
                  {zoneDetails.description ? <DialogDescription>{zoneDetails.description}</DialogDescription> : null}
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{zoneDetails.stats.member_count}</div>
                      <div className="text-sm text-muted-foreground">Members</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{zoneDetails.stats.total_checkins}</div>
                      <div className="text-sm text-muted-foreground">Total Check-ins</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{zoneDetails.stats.today_checkins}</div>
                      <div className="text-sm text-muted-foreground">Today</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Center:</strong> {zoneDetails.center_lat.toFixed(4)}, {zoneDetails.center_lng.toFixed(4)}
                    </div>
                    <div>
                      <strong>Check-in Radius:</strong> {zoneDetails.check_in_radius}m
                    </div>
                  </div>

                  {zoneDetails.rules ? (
                    <div>
                      <h4 className="font-semibold mb-2">Rules & Guidelines</h4>
                      <p className="text-sm bg-muted p-3 rounded">{zoneDetails.rules}</p>
                    </div>
                  ) : null}

                  {zoneDetails.tags?.length ? (
                    <div>
                      <h4 className="font-semibold mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {zoneDetails.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {zoneDetails.recent_checkins?.length ? (
                    <div>
                      <h4 className="font-semibold mb-2">Recent Check-ins</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {zoneDetails.recent_checkins.map((checkin) => (
                          <div key={checkin.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1">
                              {checkin.message ? <p className="text-sm">{checkin.message}</p> : null}
                              <div className="text-xs text-muted-foreground">{formatDateTime(checkin.checked_in_at)}</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="secondary">
                                <Trophy className="h-3 w-3 mr-1" />
                                {checkin.streak_count}
                              </Badge>
                              <Badge variant="outline">+{checkin.points_earned}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => joinZone.mutate(selectedZoneId)}
                    loading={joinZone.isPending}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Join Zone
                  </Button>

                  <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={getCurrentLocation}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Check In
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Check In</DialogTitle>
                        <DialogDescription>
                          We’ll verify your distance to the zone before sending the check-in.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Navigation className="h-5 w-5" />
                          <span className="text-sm">
                            {checkInLocation ? (
                              <span className={canCheckIn(zoneDetails) ? 'text-green-600' : 'text-red-600'}>
                                Location acquired ✓ {canCheckIn(zoneDetails) ? '(within range)' : '(too far)'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Getting location…</span>
                            )}
                          </span>
                        </div>

                        <div>
                          <Label htmlFor="checkin-message">Message (optional)</Label>
                          <Textarea
                            id="checkin-message"
                            value={checkInMessage}
                            onChange={(e) => setCheckInMessage(e.target.value)}
                            placeholder="Share what you’re up to…"
                            maxLength={200}
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          onClick={onSubmitCheckIn}
                          loading={checkIn.isPending}
                          disabled={!checkInLocation || !canCheckIn(zoneDetails)}
                        >
                          Check In
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
