import { useEffect, useState, useRef } from 'react';
import { TrendingUp, ShoppingBag, Tag, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityRibbonItem } from '@/lib/api-client';

interface ActivityRibbonProps {
  events: ActivityRibbonItem[];
  isLoading?: boolean;
}

const eventIcons: Record<string, React.ReactNode> = {
  NEW_LISTING: <ShoppingBag className="h-3 w-3" />,
  PRICE_DROP: <Tag className="h-3 w-3" />,
  ITEM_SOLD: <Zap className="h-3 w-3" />,
  TRADE_REQUEST: <ArrowRight className="h-3 w-3" />,
};

const eventColors: Record<string, string> = {
  NEW_LISTING: 'text-green-400',
  PRICE_DROP: 'text-red-400',
  ITEM_SOLD: 'text-yellow-400',
  TRADE_REQUEST: 'text-blue-400',
};

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function ActivityItem({ event }: { event: ActivityRibbonItem }) {
  const displayText = event.display_text || event.payload?.title || 'Activity';
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 whitespace-nowrap">
      <span className={cn('flex items-center', eventColors[event.type] || 'text-muted-foreground')}>
        {eventIcons[event.type] || <TrendingUp className="h-3 w-3" />}
      </span>
      <span className="text-xs text-muted-foreground">
        {displayText}
      </span>
      <span className="text-xs text-muted-foreground/60">
        {getTimeAgo(event.created_at)}
      </span>
    </div>
  );
}

export function ActivityRibbon({ events, isLoading }: ActivityRibbonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scroll animation
  useEffect(() => {
    if (!containerRef.current || isPaused || events.length <= 3) return;
    
    const container = containerRef.current;
    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame
    
    const animate = () => {
      scrollPosition += scrollSpeed;
      if (scrollPosition >= container.scrollWidth / 2) {
        scrollPosition = 0;
      }
      container.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [events, isPaused]);

  if (isLoading) {
    return (
      <div className="h-8 bg-muted/30 rounded-lg animate-pulse" />
    );
  }

  if (events.length === 0) {
    return null;
  }

  // Double the events for seamless loop
  const displayEvents = [...events, ...events];

  return (
    <div 
      className="relative overflow-hidden rounded-lg bg-background/50 border border-border/50"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Gradient fade on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      {/* Activity label */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center px-2 z-20 bg-background">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-green-500" />
          Live
        </span>
      </div>
      
      {/* Scrolling content */}
      <div 
        ref={containerRef}
        className="flex items-center overflow-x-hidden pl-16"
      >
        {displayEvents.map((event, index) => (
          <ActivityItem key={`${event.id}-${index}`} event={event} />
        ))}
      </div>
    </div>
  );
}

export default ActivityRibbon;
