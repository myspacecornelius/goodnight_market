import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, Eye, MapPin, CheckCircle, TrendingDown, Repeat, 
  Sparkles, Clock, MessageCircle, Share2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Listing } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  listing: Listing;
  onSave?: (id: string) => void;
  onClick?: (listing: Listing) => void;
}

const conditionConfig: Record<string, { bg: string; text: string; glow?: string }> = {
  DS: { bg: 'bg-gradient-to-r from-emerald-500 to-green-500', text: 'text-white', glow: 'shadow-emerald-500/30' },
  VNDS: { bg: 'bg-gradient-to-r from-green-500 to-teal-500', text: 'text-white', glow: 'shadow-green-500/30' },
  EXCELLENT: { bg: 'bg-gradient-to-r from-blue-500 to-cyan-500', text: 'text-white', glow: 'shadow-blue-500/30' },
  GOOD: { bg: 'bg-gradient-to-r from-amber-400 to-yellow-500', text: 'text-black' },
  FAIR: { bg: 'bg-gradient-to-r from-orange-500 to-amber-500', text: 'text-white' },
  BEAT: { bg: 'bg-gradient-to-r from-red-500 to-rose-500', text: 'text-white' },
};

const tradeIntentConfig: Record<string, { icon: React.ReactNode; label: string; bg: string }> = {
  SALE: { 
    icon: <span className="font-bold">$</span>, 
    label: 'For Sale',
    bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  },
  TRADE: { 
    icon: <Repeat className="h-3 w-3" />, 
    label: 'Trade Only',
    bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  BOTH: { 
    icon: <Sparkles className="h-3 w-3" />, 
    label: 'Sale or Trade',
    bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  },
};

export function ListingCard({ listing, onSave, onClick }: ListingCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [saveCount, setSaveCount] = useState(listing.save_count);

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    setSaveCount(prev => isSaved ? prev - 1 : prev + 1);
    onSave?.(listing.id);
  }, [isSaved, listing.id, onSave]);

  const formatPrice = (price?: number) => {
    if (!price) return 'Offer';
    return `$${price.toLocaleString()}`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
  };

  const conditionStyle = conditionConfig[listing.condition] || conditionConfig.GOOD;
  const tradeIntent = tradeIntentConfig[listing.trade_intent] || tradeIntentConfig.SALE;
  const isNew = new Date(listing.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  return (
    <motion.div
      className="group cursor-pointer"
      onClick={() => onClick?.(listing)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-xl hover:border-border transition-all duration-300">
        {/* Image Container */}
        <div className="relative aspect-[4/5] bg-gradient-to-br from-secondary to-secondary/50 overflow-hidden">
          {/* Image */}
          {!imageError ? (
            <motion.img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              <span className="text-5xl">👟</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Top Row: New Badge + Price Drop */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <div className="flex flex-col gap-1.5">
              {isNew && (
                <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 font-semibold">
                  NEW
                </Badge>
              )}
              {listing.is_verified && (
                <Badge className="bg-blue-500/90 text-white text-[10px] px-2 py-0.5 flex items-center gap-1">
                  <CheckCircle className="h-2.5 w-2.5" />
                  Verified
                </Badge>
              )}
            </div>
            
            {listing.price_drop_percent > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg"
              >
                <TrendingDown className="h-3 w-3" />
                {listing.price_drop_percent.toFixed(0)}%
              </motion.div>
            )}
          </div>

          {/* Bottom Row: Price + Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-end justify-between">
              {/* Price */}
              <div>
                <p className="text-white/70 text-[10px] font-medium uppercase tracking-wide">Price</p>
                <p className="text-white text-xl font-bold tracking-tight">
                  {formatPrice(listing.price)}
                </p>
              </div>

              {/* Quick Actions */}
              <motion.div 
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  <Share2 className="h-4 w-4 text-white" />
                </button>
              </motion.div>
            </div>
          </div>

          {/* Save Button - Always visible */}
          <motion.button
            onClick={handleSave}
            className={cn(
              "absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-sm transition-all",
              isSaved 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
                : "bg-black/30 text-white hover:bg-black/50"
            )}
            whileTap={{ scale: 0.9 }}
          >
            <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2.5">
          {/* Title */}
          <div>
            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {listing.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <span className="font-medium">{listing.brand}</span>
              <span>•</span>
              <span>Size {listing.size}</span>
            </p>
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge 
              className={cn(
                "text-[10px] px-2 py-0.5 font-medium border",
                conditionStyle.bg,
                conditionStyle.text,
                conditionStyle.glow && `shadow-sm ${conditionStyle.glow}`
              )}
            >
              {listing.condition}
              {listing.has_box && ' + Box'}
            </Badge>
            
            <Badge 
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 font-medium flex items-center gap-1",
                tradeIntent.bg
              )}
            >
              {tradeIntent.icon}
              {tradeIntent.label}
            </Badge>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="text-xs font-medium">{listing.distance_miles?.toFixed(1) || '?'} mi</span>
            </div>
            
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1 text-xs">
                <Eye className="h-3 w-3" />
                {listing.view_count}
              </span>
              <span className={cn(
                "flex items-center gap-1 text-xs",
                isSaved && "text-red-500"
              )}>
                <Heart className={cn("h-3 w-3", isSaved && "fill-current")} />
                {saveCount}
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {getTimeAgo(listing.created_at)}
              </span>
            </div>
          </div>

          {/* Trade Interests */}
          {listing.trade_intent !== 'SALE' && listing.trade_interests && listing.trade_interests.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium">Looking for:</span>{' '}
                <span className="text-foreground">
                  {listing.trade_interests.slice(0, 2).join(', ')}
                </span>
                {listing.trade_interests.length > 2 && (
                  <span className="text-primary"> +{listing.trade_interests.length - 2} more</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ListingCard;
