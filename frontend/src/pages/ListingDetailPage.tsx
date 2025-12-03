import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, Heart, MessageCircle, Share2, ShieldCheck, 
  ArrowLeft, CheckCircle, Calendar, Ruler, Box 
} from 'lucide-react';
import { apiClient, type Listing } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await apiClient.getListing(id);
        setListing(data);
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading listing...</div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || 'Listing not found'}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'Make Offer';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-lg truncate flex-1">
          {listing.title}
        </h1>
        <Button variant="ghost" size="icon">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square md:aspect-video rounded-xl overflow-hidden bg-muted relative">
            <img 
              src={listing.images[activeImage]} 
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {listing.is_verified && (
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-blue-500 hover:bg-blue-600 gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified Authentic
                </Badge>
              </div>
            )}
          </div>
          {listing.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {listing.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={cn(
                    "relative w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors",
                    activeImage === idx ? "border-primary" : "border-transparent"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Info */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{listing.title}</h2>
                  <p className="text-lg text-muted-foreground">{listing.brand}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(listing.price)}
                  </div>
                  {listing.original_price && (
                    <div className="text-sm text-muted-foreground line-through">
                      {formatPrice(listing.original_price)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="gap-1">
                  <Ruler className="h-3 w-3" /> Size {listing.size} {listing.size_type}
                </Badge>
                <Badge variant={listing.condition === 'DS' ? 'default' : 'secondary'} className="gap-1">
                  <CheckCircle className="h-3 w-3" /> {listing.condition}
                </Badge>
                {listing.has_box && (
                  <Badge variant="outline" className="gap-1">
                    <Box className="h-3 w-3" /> Original Box
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" /> Posted {new Date(listing.created_at).toLocaleDateString()}
                </Badge>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {listing.description || "No description provided."}
                </p>
                {listing.condition_notes && (
                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    <span className="font-medium">Condition Notes: </span>
                    {listing.condition_notes}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trade Info */}
            {listing.trade_intent !== 'SALE' && (
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-blue-600 mb-2">Open to Trades</h3>
                  {listing.trade_interests && listing.trade_interests.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Looking for:</p>
                      <div className="flex flex-wrap gap-2">
                        {listing.trade_interests.map((interest, i) => (
                          <Badge key={i} variant="secondary" className="bg-background">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {listing.trade_notes && (
                    <p className="text-sm text-muted-foreground">"{listing.trade_notes}"</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar / Actions */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
                    {listing.user_id.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">Seller</p>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{listing.distance_miles ? `${listing.distance_miles.toFixed(1)} mi away` : 'Nearby'}</span>
                    </div>
                  </div>
                </div>

                <Button className="w-full gap-2" size="lg">
                  <MessageCircle className="h-4 w-4" /> Message Seller
                </Button>
                
                {listing.trade_intent !== 'SALE' && (
                  <Button variant="outline" className="w-full gap-2">
                    <RefreshCw className="h-4 w-4" /> Propose Trade
                  </Button>
                )}
                
                <Button variant="ghost" className="w-full gap-2">
                  <Heart className="h-4 w-4" /> Save to Watchlist
                </Button>
              </CardContent>
            </Card>
            
            <div className="text-xs text-center text-muted-foreground">
              Protected by Dharma Buyer Guarantee
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { RefreshCw } from 'lucide-react';
