import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Search, Flame, RefreshCw, ArrowRight, SlidersHorizontal,
  Sparkles, TrendingUp, Zap, ChevronDown, X, Filter
} from 'lucide-react';
import { apiClient, type Listing, type HyperlocalFeedResponse, type ActivityRibbonItem, type TradeMatch } from '@/lib/api-client';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { ActivityRibbon } from '@/components/marketplace/ActivityRibbon';
import { TradeMatchCard } from '@/components/marketplace/TradeMatchCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
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

const heatLevelConfig: Record<string, { bg: string; glow: string; icon: React.ReactNode; label: string }> = {
  cold: { 
    bg: 'bg-gradient-to-r from-blue-500 to-cyan-500', 
    glow: 'shadow-blue-500/30',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    label: 'Chill Zone'
  },
  warm: { 
    bg: 'bg-gradient-to-r from-amber-500 to-yellow-500', 
    glow: 'shadow-amber-500/30',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    label: 'Heating Up'
  },
  hot: { 
    bg: 'bg-gradient-to-r from-orange-500 to-red-500', 
    glow: 'shadow-orange-500/30',
    icon: <Flame className="h-3.5 w-3.5" />,
    label: 'Hot Market'
  },
  fire: { 
    bg: 'bg-gradient-to-r from-red-500 to-pink-500', 
    glow: 'shadow-red-500/40',
    icon: <Zap className="h-3.5 w-3.5" />,
    label: 'On Fire 🔥'
  },
};

export function MarketplacePage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityRibbonItem[]>([]);
  const [tradeMatches, setTradeMatches] = useState<TradeMatch[]>([]);
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
  const [showFilters, setShowFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Calculate active filters
  useEffect(() => {
    let count = 0;
    if (selectedBrand) count++;
    if (selectedCondition) count++;
    if (radius !== '3') count++;
    if (sortBy !== 'rank') count++;
    setActiveFiltersCount(count);
  }, [selectedBrand, selectedCondition, radius, sortBy]);

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

  // Fetch trade matches
  const fetchTradeMatches = useCallback(async () => {
    try {
      const response = await apiClient.getTradeMatches();
      setTradeMatches(response.matches);
    } catch (err) {
      console.error('Error fetching trade matches:', err);
    }
  }, []);

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
    fetchTradeMatches();
  }, [fetchListings, fetchActivity, fetchTradeMatches]);

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
    navigate(`/marketplace/${listing.id}`);
  };

  const handleSaveListing = async (listingId: string) => {
    try {
      await apiClient.saveListing(listingId);
    } catch (err) {
      console.error('Error saving listing:', err);
    }
  };

  const heatConfig = heatLevelConfig[heatLevel] || heatLevelConfig.cold;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Premium Header */}
      <div className="sticky top-0 z-30">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/98 to-background/95 backdrop-blur-xl" />
        
        <div className="relative px-4 pt-4 pb-3 space-y-4">
          {/* Top Bar: Location + Heat Level */}
          <div className="flex items-center justify-between">
            <motion.button
              onClick={requestLocation}
              className="flex items-center gap-2.5 px-3 py-2 rounded-full bg-secondary/50 hover:bg-secondary transition-all group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <span className="font-medium text-sm">{locationName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </motion.button>
            
            <motion.div 
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-white font-medium text-sm shadow-lg',
                heatConfig.bg,
                heatConfig.glow
              )}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={heatLevel}
            >
              {heatConfig.icon}
              <span>{heatConfig.label}</span>
              <span className="text-white/70 text-xs">• {totalCount}</span>
            </motion.div>
          </div>

          {/* Activity Ribbon - Enhanced */}
          <div className="-mx-4">
            <ActivityRibbon events={activityEvents} isLoading={isLoading} />
          </div>

          {/* Trade Matches - Premium Carousel */}
          <AnimatePresence>
            {tradeMatches.length > 0 && (
              <motion.div 
                className="-mx-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="px-4 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                      <RefreshCw className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Trade Opportunities</h3>
                      <p className="text-xs text-muted-foreground">{tradeMatches.length} matches nearby</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary">
                    See All <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-3 px-4 snap-x snap-mandatory scrollbar-hide">
                  {tradeMatches.slice(0, 5).map((match, i) => (
                    <motion.div 
                      key={match.id} 
                      className="min-w-[300px] snap-center"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <TradeMatchCard match={match} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Bar - Premium */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Jordan, Dunk, Yeezy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 h-12 rounded-xl bg-secondary/50 border-0 focus:bg-secondary focus:ring-2 focus:ring-primary/20 transition-all text-base"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background/50"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <Button
                variant={showFilters ? 'default' : 'secondary'}
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-xl relative",
                  showFilters && "bg-primary"
                )}
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-5 w-5" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Filters Panel - Collapsible */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Filter className="h-4 w-4" /> Filters
                    </span>
                    {activeFiltersCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-7"
                        onClick={() => {
                          setSelectedBrand('');
                          setSelectedCondition('');
                          setRadius('3');
                          setSortBy('rank');
                        }}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Sort By</label>
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="h-10 bg-background/50">
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
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Distance</label>
                      <Select value={radius} onValueChange={setRadius}>
                        <SelectTrigger className="h-10 bg-background/50">
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
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs text-muted-foreground">Condition</label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={selectedCondition === '' ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setSelectedCondition('')}
                        >
                          All
                        </Button>
                        {CONDITION_OPTIONS.map((cond) => (
                          <Button
                            key={cond}
                            variant={selectedCondition === cond ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setSelectedCondition(cond)}
                          >
                            {cond}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button 
                    className="w-full h-10"
                    onClick={() => {
                      fetchListings();
                      fetchActivity();
                      setShowFilters(false);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-24">
        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-destructive font-medium mb-2">Something went wrong</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchListings}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State - Premium Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="rounded-2xl overflow-hidden bg-secondary/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="aspect-square bg-gradient-to-br from-secondary to-secondary/50 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-secondary rounded-full w-3/4 animate-pulse" />
                  <div className="h-3 bg-secondary rounded-full w-1/2 animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-secondary rounded-full w-16 animate-pulse" />
                    <div className="h-6 bg-secondary rounded-full w-12 animate-pulse" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State - Premium */}
        {!isLoading && !error && filteredListings.length === 0 && (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-xl" />
              <div className="relative w-full h-full bg-secondary/50 rounded-full flex items-center justify-center">
                <span className="text-5xl">👟</span>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">No kicks found</h3>
            <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
              Try expanding your search radius or adjusting your filters
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedBrand('');
                  setSelectedCondition('');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
              <Button onClick={() => setRadius('5')}>
                Expand Radius
              </Button>
            </div>
          </motion.div>
        )}

        {/* Listings Grid - Premium */}
        {!isLoading && !error && filteredListings.length > 0 && (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredListings.length}</span> listings nearby
              </p>
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-xs">
                  Clear search <X className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
            
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {filteredListings.map((listing) => (
                <motion.div
                  key={listing.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <ListingCard
                    listing={listing}
                    onClick={handleListingClick}
                    onSave={handleSaveListing}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

export default MarketplacePage;
