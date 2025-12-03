import { useState } from 'react';
import { Check, X, MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

  if (status === 'DECLINED') {
    return null;
  }

  const isThreeWay = match.match_type === 'THREE_WAY';

  return (
    <Card className={cn(
      "overflow-hidden border-l-4 transition-all",
      status === 'ACCEPTED' ? "border-l-green-500 bg-green-500/5" : "border-l-blue-500"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Badge variant={isThreeWay ? "secondary" : "outline"} className="text-xs">
            {isThreeWay ? "3-Way Trade" : "Direct Swap"}
          </Badge>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-background text-xs gap-1">
              <MapPin className="h-3 w-3" />
              {match.locality_score > 80 ? "Very Close" : "Local"}
            </Badge>
            <Badge variant="outline" className="bg-background text-xs">
              {match.match_score.toFixed(0)}% Match
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-4">
          {/* You Give */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">You Give</p>
            <p className="font-medium text-sm truncate" title={match.you_offer.title}>
              {match.you_offer.title}
            </p>
          </div>

          {/* Icon */}
          <div className="flex flex-col items-center justify-center px-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
          </div>

          {/* You Get */}
          <div className="flex-1 min-w-0 text-right">
            <p className="text-xs text-muted-foreground mb-1">You Get</p>
            <p className="font-medium text-sm truncate" title={match.you_receive.title}>
              {match.you_receive.title}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {status === 'ACCEPTED' ? (
            <Button className="w-full bg-green-500 hover:bg-green-600 cursor-default" disabled>
              <Check className="h-4 w-4 mr-2" /> Accepted
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="flex-1 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={handleDecline}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-2" /> Decline
              </Button>
              <Button 
                className="flex-1"
                onClick={handleAccept}
                disabled={isProcessing}
              >
                <Check className="h-4 w-4 mr-2" /> Accept
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
