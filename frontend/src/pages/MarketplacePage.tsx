import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Heart, MapPin } from 'lucide-react';
import { apiClient, type Listing, type HyperlocalFeedResponse } from '@/lib/api-client';

const DEFAULT_LOCATION = { lat: 42.3505, lng: -71.0763 };

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'DS', label: 'Deadstock' },
  { id: 'VNDS', label: 'VNDS' },
  { id: 'used', label: 'Used' },
];

export function MarketplacePage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location] = useState(DEFAULT_LOCATION);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const condition = activeTab === 'all' ? undefined : 
                       activeTab === 'used' ? 'GOOD' : activeTab;
      
      const response: HyperlocalFeedResponse = await apiClient.getHyperlocalListings({
        lat: location.lat,
        lng: location.lng,
        radius: 3,
        condition,
        sort_by: 'newest',
        limit: 50,
      });
      
      setListings(response.listings);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Unable to load listings');
    } finally {
      setIsLoading(false);
    }
  }, [location, activeTab]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const filteredListings = listings.filter((listing) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return listing.title.toLowerCase().includes(q) || listing.brand.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: '#FAFAF8', borderColor: '#E8E8E6' }}>
        <div className="max-w-3xl mx-auto px-4">
          {/* Search */}
          <div className="py-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Search sneakers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-12 rounded-xl text-base transition-shadow focus:outline-none focus:ring-2"
                style={{ 
                  background: '#F3F3F1', 
                  border: '1px solid #E8E8E6',
                  color: '#1F2937'
                }}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/50"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5" style={{ color: '#9CA3AF' }} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 pb-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: activeTab === tab.id ? '#1F2937' : 'transparent',
                  color: activeTab === tab.id ? '#FFFFFF' : '#6B7280',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#D1D5DB', borderTopColor: 'transparent' }} />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="text-center py-20">
            <p style={{ color: '#6B7280' }}>{error}</p>
            <button 
              onClick={fetchListings}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: '#F3F3F1', color: '#1F2937' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filteredListings.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: '#F3F3F1' }}>
              <span className="text-4xl">👟</span>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>No sneakers found</h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>Try a different search or filter</p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !error && filteredListings.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredListings.map((listing) => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                onClick={() => navigate(`/marketplace/${listing.id}`)} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ListingCard({ listing, onClick }: { listing: Listing; onClick: () => void }) {
  const [saved, setSaved] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const price = listing.price ? `$${listing.price.toLocaleString()}` : 'Offer';

  return (
    <article 
      onClick={onClick}
      className="group cursor-pointer rounded-xl overflow-hidden transition-shadow hover:shadow-lg"
      style={{ background: '#FFFFFF', border: '1px solid #E8E8E6' }}
    >
      {/* Image */}
      <div className="relative aspect-square" style={{ background: '#F3F3F1' }}>
        {!imgLoaded && <div className="absolute inset-0 animate-pulse" style={{ background: '#E8E8E6' }} />}
        <img
          src={listing.images?.[0] || '/placeholder.png'}
          alt={listing.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(true)}
        />
        
        {/* Save Button */}
        <button
          onClick={(e) => { e.stopPropagation(); setSaved(!saved); }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ 
            background: saved ? '#EF4444' : 'rgba(255,255,255,0.9)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          aria-label="Save listing"
        >
          <Heart 
            className="h-4 w-4" 
            style={{ color: saved ? '#FFFFFF' : '#6B7280' }}
            fill={saved ? '#FFFFFF' : 'none'}
          />
        </button>

        {/* Condition Badge */}
        <div 
          className="absolute bottom-3 left-3 px-2 py-1 rounded-md text-xs font-medium"
          style={{ 
            background: listing.condition === 'DS' ? '#10B981' : 'rgba(255,255,255,0.9)',
            color: listing.condition === 'DS' ? '#FFFFFF' : '#374151',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {listing.condition}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate mb-1" style={{ color: '#1F2937' }}>
          {listing.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#6B7280' }}>
            Size {listing.size}
          </span>
          <span className="font-semibold text-sm" style={{ color: '#1F2937' }}>
            {price}
          </span>
        </div>
        {listing.distance_miles && (
          <div className="flex items-center gap-1 mt-2">
            <MapPin className="h-3 w-3" style={{ color: '#9CA3AF' }} />
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              {listing.distance_miles.toFixed(1)} mi
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

export default MarketplacePage;
