import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, MapPin, ArrowLeftRight, Sparkles, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { apiClient, type TradeMatch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface TradeMatchCardProps {
  match: TradeMatch;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
}

export function TradeMatchCard({ match, onAccept, onDecline }: TradeMatchCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(match.status);
  const [isHovered, setIsHovered] = useState(false);

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await apiClient.acceptTradeMatch(match.id);
      setStatus('ACCEPTED');
      onAccept?.(match.id);
    } catch (err) {
      console.error('Error accepting trade:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await apiClient.declineTradeMatch(match.id);
      setStatus('DECLINED');
      onDecline?.(match.id);
    } catch (err) {
      console.error('Error declining trade:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isThreeWay = match.match_type === 'THREE_WAY';
  const matchQuality = match.match_score >= 90 ? 'excellent' : match.match_score >= 75 ? 'great' : 'good';

  return (
    <AnimatePresence mode="wait">
      {status === 'DECLINED' ? null : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          transition={{ duration: 0.2 }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className={cn(
            "relative rounded-2xl overflow-hidden transition-all duration-300",
            status === 'ACCEPTED' 
              ? "bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-2 border-emerald-500/30" 
              : "bg-gradient-to-br from-card to-secondary/20 border border-border/50 hover:border-primary/30 hover:shadow-lg"
          )}
        >
          {/* Match Quality Indicator */}
          <div className={cn(
            "absolute top-0 left-0 right-0 h-1",
            matchQuality === 'excellent' && "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500",
            matchQuality === 'great' && "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500",
            matchQuality === 'good' && "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500"
          )} />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge 
                  className={cn(
                    "text-[10px] px-2 py-0.5 font-semibold",
                    isThreeWay 
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0" 
                      : "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  {isThreeWay ? (
                    <><Sparkles className="h-3 w-3 mr-1" />3-Way</>  
                  ) : (
                    <><ArrowLeftRight className="h-3 w-3 mr-1" />Direct</>  
                  )}
                </Badge>
                
                {match.locality_score > 80 && (
                  <Badge className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    <MapPin className="h-2.5 w-2.5 mr-1" />
                    Nearby
                  </Badge>
                )}
              </div>
              
              {/* Match Score */}
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                matchQuality === 'excellent' && "bg-emerald-500/10 text-emerald-500",
                matchQuality === 'great' && "bg-blue-500/10 text-blue-500",
                matchQuality === 'good' && "bg-amber-500/10 text-amber-500"
              )}>
                {matchQuality === 'excellent' && <Zap className="h-3 w-3" />}
                {matchQuality === 'great' && <Star className="h-3 w-3" />}
                {match.match_score.toFixed(0)}%
              </div>
            </div>

            {/* Trade Items */}
            <div className="flex items-stretch gap-3 mb-4">
              {/* You Give */}
              <div className="flex-1 min-w-0 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] font-medium text-red-400 uppercase tracking-wide mb-1.5">You Give</p>
                <div className="flex items-center gap-2">
                  {match.you_offer.image && (
                    <img 
                      src={match.you_offer.image} 
                      alt="" 
                      className="w-10 h-10 rounded-lg object-cover bg-secondary"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" title={match.you_offer.title}>
                      {match.you_offer.title}
                    </p>
                    {match.you_offer.size && (
                      <p className="text-xs text-muted-foreground">Size {match.you_offer.size}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <motion.div
                  animate={{ x: isHovered ? [0, 4, 0] : 0 }}
                  transition={{ repeat: isHovered ? Infinity : 0, duration: 1 }}
                  className="p-2 rounded-full bg-primary/10"
                >
                  <ArrowLeftRight className="h-4 w-4 text-primary" />
                </motion.div>
              </div>

              {/* You Get */}
              <div className="flex-1 min-w-0 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide mb-1.5">You Get</p>
                <div className="flex items-center gap-2">
                  {match.you_receive.image && (
                    <img 
                      src={match.you_receive.image} 
                      alt="" 
                      className="w-10 h-10 rounded-lg object-cover bg-secondary"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" title={match.you_receive.title}>
                      {match.you_receive.title}
                    </p>
                    {match.you_receive.size && (
                      <p className="text-xs text-muted-foreground">Size {match.you_receive.size}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {status === 'ACCEPTED' ? (
                <motion.div 
                  className="w-full"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                >
                  <Button 
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg shadow-emerald-500/20" 
                    disabled
                  >
                    <Check className="h-4 w-4 mr-2" /> Trade Accepted!
                  </Button>
                </motion.div>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/30"
                    onClick={handleDecline}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4 mr-1" /> Pass
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                    onClick={handleAccept}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <><Check className="h-4 w-4 mr-1" /> Accept</>  
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
