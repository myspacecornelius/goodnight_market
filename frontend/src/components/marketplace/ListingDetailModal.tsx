import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Box, Ruler, Tag, ShieldCheck, Heart, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';
import type { Listing } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ListingDetailModalProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (id: string) => void;
  onContact?: (id: string) => void;
}

export function ListingDetailModal({ listing, isOpen, onClose, onSave, onContact }: ListingDetailModalProps) {
  if (!listing) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col md:flex-row">
        {/* Image Gallery Section */}
        <div className="w-full md:w-1/2 bg-black/5 relative flex items-center justify-center min-h-[300px] md:min-h-full">
          {listing.images && listing.images.length > 0 ? (
            <img 
              src={listing.images[0]} 
              alt={listing.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex flex-col items-center">
              <Box className="w-16 h-16 mb-2 opacity-50" />
              <span>No Images</span>
            </div>
          )}
          
          {/* Status Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
              {listing.status.toUpperCase()}
            </Badge>
            {listing.is_verified && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-200">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="w-full md:w-1/2 flex flex-col h-full bg-background">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-xl font-bold leading-tight">{listing.title}</h2>
                    <p className="text-muted-foreground text-sm mt-1">{listing.brand} • {listing.sku}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {listing.price ? `$${listing.price}` : 'Trade Only'}
                    </div>
                    {listing.original_price && (
                      <div className="text-xs text-muted-foreground line-through">
                        ${listing.original_price}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3" />
                  <span>Posted {formatDistanceToNow(new Date(listing.created_at))} ago</span>
                  <span>•</span>
                  <MapPin className="w-3 h-3" />
                  <span>{listing.distance_miles ? `${listing.distance_miles} miles away` : 'Nearby'}</span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Size</span>
                  <div className="font-medium flex items-center gap-1">
                    <Ruler className="w-3 h-3 text-muted-foreground" />
                    {listing.size} ({listing.size_type})
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Condition</span>
                  <div className="font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {listing.condition}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Box Status</span>
                  <div className="font-medium flex items-center gap-1">
                    <Box className="w-3 h-3 text-muted-foreground" />
                    {listing.has_box ? 'Original Box' : 'No Box'}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Authenticity</span>
                  <div className="font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-muted-foreground" />
                    {listing.authenticity_score}/100
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {listing.description || 'No description provided.'}
                </p>
              </div>

              {/* Trade Info */}
              {listing.trade_intent !== 'SALE' && (
                <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900">
                  <h3 className="font-medium text-sm text-blue-700 dark:text-blue-300">Open to Trades</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {listing.trade_interests?.map((interest, i) => (
                      <Badge key={i} variant="outline" className="bg-background/50 border-blue-200 dark:border-blue-800 text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                  {listing.trade_notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">"{listing.trade_notes}"</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Action Bar */}
          <div className="p-4 border-t bg-background space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => onSave?.(listing.id)}
              >
                <Heart className={cn("w-4 h-4", listing.save_count > 0 ? "fill-red-500 text-red-500" : "")} />
                Save {listing.save_count > 0 && `(${listing.save_count})`}
              </Button>
              <Button 
                className="w-full gap-2"
                onClick={() => onContact?.(listing.id)}
              >
                <MessageCircle className="w-4 h-4" />
                Contact Seller
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
