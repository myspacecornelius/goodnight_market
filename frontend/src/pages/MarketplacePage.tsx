import { useEffect, useState, useCallback } from 'react';
import { MapPin, Search, Flame, RefreshCw } from 'lucide-react';
import { apiClient, type Listing, type HyperlocalFeedResponse, type ActivityRibbonItem } from '@/lib/api-client';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { ActivityRibbon } from '@/components/marketplace/ActivityRibbon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Default location (Boston - Newbury Street)
const DEFAULT_LOCATION = { lat: 42.3505, lng: -71.0763 };

const SORT_OPTIONS = [
  { value: 'rank', label: 'Best Match' },
  { value: 'newest', label: 'Newest' },
  { value: 'price', label: 'Price: Low to High' },
  { value: 'distance', label: 'Nearest' },
];

const RADIUS_OPTIONS = [
  { value: '0.5', label: '0.5 mi' },
  { value: '1', label: '1 mi' },
  { value: '3', label: '3 mi' },
  { value: '5', label: '5 mi' },
];

const CONDITION_OPTIONS = ['DS', 'VNDS', 'EXCELLENT', 'GOOD', 'FAIR'];

const heatLevelColors: Record<string, string> = {
  cold: 'bg-blue-500',
  warm: 'bg-yellow-500',
  hot: 'bg-orange-500',
  fire: 'bg-red-500',
};

export function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityRibbonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Location state
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationName, setLocationName] = useState('Boston, MA');
  
  // Filter state
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'newest' | 'distance'>('rank');
  const [radius, setRadius] = useState('3');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Feed metadata
  const [totalCount, setTotalCount] = useState(0);
  const [heatLevel, setHeatLevel] = useState<string>('cold');

  // Fetch listings
  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: HyperlocalFeedResponse = await apiClient.getHyperlocalListings({
        lat: location.lat,
        lng: location.lng,
        radius: parseFloat(radius),
        brand: selectedBrand || undefined,
        condition: selectedCondition || undefined,
        sort_by: sortBy,
        limit: 50,
      });
      
      setListings(response.listings);
      setTotalCount(response.total_count);
      setHeatLevel(response.heat_level);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load marketplace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [location, radius, selectedBrand, selectedCondition, sortBy]);

  // Fetch activity ribbon
  const fetchActivity = useCallback(async () => {
    try {
      const response = await apiClient.getActivityRibbon(location.lat, location.lng, parseFloat(radius));
      setActivityEvents(response.events);
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  }, [location, radius]);

  // Get user's location
  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationName('Your Location');
        },
        (err) => {
          console.error('Geolocation error:', err);
        }
      );
    }
  };

  useEffect(() => {
    fetchListings();
    fetchActivity();
  }, [fetchListings, fetchActivity]);

  // Filter listings by search query
  const filteredListings = listings.filter((listing) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      listing.title.toLowerCase().includes(query) ||
      listing.brand.toLowerCase().includes(query) ||
      listing.sku?.toLowerCase().includes(query)
    );
  });

  const handleListingClick = (listing: Listing) => {
    // TODO: Open listing detail modal/page
    console.log('Listing clicked:', listing.id);
  };

  const handleSaveListing = async (listingId: string) => {
    try {
      await apiClient.saveListing(listingId);
    } catch (err) {
      console.error('Error saving listing:', err);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 space-y-3">
        {/* Location and Heat Level */}
        <div className="flex items-center justify-between">
          <button
            onClick={requestLocation}
            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
          >
            <MapPin className="h-4 w-4" />
            <span className="font-medium">{locationName}</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Badge className={cn('flex items-center gap-1', heatLevelColors[heatLevel])}>
              <Flame className="h-3 w-3" />
              {heatLevel.charAt(0).toUpperCase() + heatLevel.slice(1)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {totalCount} listings
            </span>
          </div>
        </div>

        {/* Activity Ribbon */}
        <ActivityRibbon events={activityEvents} isLoading={isLoading} />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by brand, model, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={radius} onValueChange={setRadius}>
            <SelectTrigger className="w-[80px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCondition} onValueChange={setSelectedCondition}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {CONDITION_OPTIONS.map((cond) => (
                <SelectItem key={cond} value={cond}>
                  {cond}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchListings();
              fetchActivity();
            }}
            className="h-8"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchListings} className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredListings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">👟</div>
          <h3 className="font-medium mb-2">No listings found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try expanding your search radius or clearing filters
          </p>
          <Button variant="outline" onClick={() => {
            setSelectedBrand('');
            setSelectedCondition('');
            setSearchQuery('');
            setRadius('5');
          }}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Listings Grid */}
      {!isLoading && !error && filteredListings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={handleListingClick}
              onSave={handleSaveListing}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MarketplacePage;
