import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Heart, MessageCircle, Share2, ArrowLeft, RefreshCw } from 'lucide-react';
import { apiClient, type Listing } from '@/lib/api-client';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await apiClient.getListing(id);
        setListing(data);
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing');
      } finally {
        setIsLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#D1D5DB', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ background: '#FAFAF8' }}>
        <p style={{ color: '#6B7280' }}>{error || 'Listing not found'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#F3F3F1', color: '#1F2937' }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const price = listing.price ? `$${listing.price.toLocaleString()}` : 'Make Offer';
  const postedDate = new Date(listing.created_at).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric' 
  });

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: '#FAFAF8', borderColor: '#E8E8E6' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'transparent' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#F3F3F1'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" style={{ color: '#1F2937' }} />
          </button>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsSaved(!isSaved)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'transparent' }}
              aria-label="Save listing"
            >
              <Heart 
                className="h-5 w-5" 
                style={{ color: isSaved ? '#EF4444' : '#6B7280' }}
                fill={isSaved ? '#EF4444' : 'none'}
              />
            </button>
            <button 
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'transparent' }}
              aria-label="Share listing"
            >
              <Share2 className="h-5 w-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto">
        {/* Image */}
        <div className="aspect-[4/3] relative" style={{ background: '#F3F3F1' }}>
          <img 
            src={listing.images?.[activeImage] || '/placeholder.png'} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          {listing.is_verified && (
            <div 
              className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#1F2937', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              ✓ Verified
            </div>
          )}
        </div>
        
        {/* Thumbnails */}
        {listing.images && listing.images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto" style={{ background: '#F3F3F1' }}>
            {listing.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all"
                style={{ 
                  opacity: activeImage === idx ? 1 : 0.5,
                  border: activeImage === idx ? '2px solid #1F2937' : '2px solid transparent'
                }}
                aria-label={`View image ${idx + 1}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-6" style={{ background: '#FFFFFF' }}>
          {/* Title & Price */}
          <div>
            <h1 className="text-2xl font-semibold mb-1" style={{ color: '#1F2937' }}>{listing.title}</h1>
            <p className="text-sm mb-3" style={{ color: '#6B7280' }}>{listing.brand}</p>
            <p className="text-3xl font-bold" style={{ color: '#1F2937' }}>{price}</p>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: '#F3F3F1', color: '#374151' }}>
              Size {listing.size} {listing.size_type}
            </span>
            <span 
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ 
                background: listing.condition === 'DS' ? '#10B981' : '#F3F3F1',
                color: listing.condition === 'DS' ? '#FFFFFF' : '#374151'
              }}
            >
              {listing.condition}
            </span>
            {listing.has_box && (
              <span className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: '#F3F3F1', color: '#374151' }}>
                Original Box
              </span>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #E8E8E6' }} />

          {/* Seller */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ background: '#E8E8E6', color: '#374151' }}
              >
                {listing.user_id?.substring(0, 2).toUpperCase() || 'UN'}
              </div>
              <div>
                <p className="font-medium" style={{ color: '#1F2937' }}>Seller</p>
                <p className="text-sm flex items-center gap-1" style={{ color: '#6B7280' }}>
                  <MapPin className="h-3 w-3" />
                  {listing.distance_miles ? `${listing.distance_miles.toFixed(1)} mi away` : 'Nearby'}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #E8E8E6' }} />

          {/* Description */}
          {listing.description && (
            <div>
              <h2 className="font-semibold mb-2" style={{ color: '#1F2937' }}>Description</h2>
              <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#6B7280' }}>
                {listing.description}
              </p>
            </div>
          )}

          {/* Condition Notes */}
          {listing.condition_notes && (
            <div className="p-4 rounded-lg" style={{ background: '#F3F3F1' }}>
              <p className="text-sm">
                <span className="font-medium" style={{ color: '#374151' }}>Condition Notes: </span>
                <span style={{ color: '#6B7280' }}>{listing.condition_notes}</span>
              </p>
            </div>
          )}

          {/* Trade Section */}
          {listing.trade_intent !== 'SALE' && (
            <div className="p-4 rounded-lg" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4" style={{ color: '#2563EB' }} />
                <span className="font-medium" style={{ color: '#1D4ED8' }}>Open to Trades</span>
              </div>
              {listing.trade_interests && listing.trade_interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {listing.trade_interests.map((interest, i) => (
                    <span key={i} className="px-2 py-1 rounded text-sm" style={{ background: '#FFFFFF', color: '#374151' }}>
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Posted date */}
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Posted {postedDate}</p>
        </div>

        {/* Bottom CTA */}
        <div className="sticky bottom-0 p-4 border-t" style={{ background: '#FFFFFF', borderColor: '#E8E8E6' }}>
          <div className="flex gap-3 max-w-3xl mx-auto">
            {listing.trade_intent !== 'SALE' && (
              <button 
                className="flex-1 h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                style={{ background: '#F3F3F1', color: '#1F2937', border: '1px solid #E8E8E6' }}
              >
                <RefreshCw className="h-4 w-4" />
                Propose Trade
              </button>
            )}
            <button 
              className="flex-1 h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              style={{ background: '#1F2937', color: '#FFFFFF' }}
            >
              <MessageCircle className="h-4 w-4" />
              Message Seller
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
