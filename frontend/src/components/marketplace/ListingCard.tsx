import { useState } from 'react';
import { Heart, Eye, MapPin, CheckCircle, TrendingDown, Repeat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import type { Listing } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  listing: Listing;
  onSave?: (id: string) => void;
  onMessage?: (id: string) => void;
  onClick?: (listing: Listing) => void;
}

const conditionColors: Record<string, string> = {
  DS: 'bg-emerald-500 text-white',
  VNDS: 'bg-green-500 text-white',
  EXCELLENT: 'bg-blue-500 text-white',
  GOOD: 'bg-yellow-500 text-black',
  FAIR: 'bg-orange-500 text-white',
  BEAT: 'bg-red-500 text-white',
};

const tradeIntentIcons: Record<string, React.ReactNode> = {
  SALE: <span className="text-green-500">$</span>,
  TRADE: <Repeat className="h-3 w-3 text-blue-500" />,
  BOTH: <span className="text-purple-500">$+↔</span>,
};

export function ListingCard({ listing, onSave, onMessage: _onMessage, onClick }: ListingCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave?.(listing.id);
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Make Offer';
    return `$${price.toLocaleString()}`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-border/50"
      onClick={() => onClick?.(listing)}
    >
      <div className="relative aspect-square bg-muted">
        {/* Image */}
        {!imageError ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <span className="text-4xl">👟</span>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-black/80 text-white font-bold text-lg px-3 py-1">
            {formatPrice(listing.price)}
          </Badge>
        </div>

        {/* Price drop indicator */}
        {listing.price_drop_percent > 0 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-red-500 text-white flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              {listing.price_drop_percent.toFixed(0)}% OFF
            </Badge>
          </div>
        )}

        {/* Verified badge */}
        {listing.is_verified && (
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-blue-500 text-white flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Verified
            </Badge>
          </div>
        )}

        {/* Trade intent */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {tradeIntentIcons[listing.trade_intent]}
            {listing.trade_intent === 'BOTH' ? 'Sale/Trade' : listing.trade_intent}
          </Badge>
        </div>

        {/* Save button overlay */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-12 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
            isSaved && "text-red-500"
          )}
          onClick={handleSave}
        >
          <Heart className={cn("h-5 w-5", isSaved && "fill-current")} />
        </Button>
      </div>

      <CardContent className="p-3">
        {/* Title and brand */}
        <div className="mb-2">
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
            {listing.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {listing.brand} • Size {listing.size}
          </p>
        </div>

        {/* Condition and meta */}
        <div className="flex items-center justify-between mb-2">
          <Badge className={cn("text-xs", conditionColors[listing.condition])}>
            {listing.condition}
            {listing.has_box && ' + Box'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {getTimeAgo(listing.created_at)}
          </span>
        </div>

        {/* Location and stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{listing.distance_miles?.toFixed(1) || '?'} mi</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {listing.view_count}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {listing.save_count}
            </span>
          </div>
        </div>

        {/* Trade interests preview */}
        {listing.trade_intent !== 'SALE' && listing.trade_interests && listing.trade_interests.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Looking for: <span className="text-foreground">{listing.trade_interests.slice(0, 2).join(', ')}</span>
              {listing.trade_interests.length > 2 && ` +${listing.trade_interests.length - 2}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ListingCard;
