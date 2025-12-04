import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Tag, Zap, ArrowRight, Sparkles, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityRibbonItem } from '@/lib/api-client';

interface ActivityRibbonProps {
  events: ActivityRibbonItem[];
  isLoading?: boolean;
}

const eventConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  NEW_LISTING: { 
    icon: <ShoppingBag className="h-3 w-3" />, 
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'New'
  },
  PRICE_DROP: { 
    icon: <Tag className="h-3 w-3" />, 
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    label: 'Drop'
  },
  ITEM_SOLD: { 
    icon: <Zap className="h-3 w-3" />, 
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    label: 'Sold'
  },
  TRADE_REQUEST: { 
    icon: <ArrowRight className="h-3 w-3" />, 
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    label: 'Trade'
  },
  RESTOCK: {
    icon: <Sparkles className="h-3 w-3" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    label: 'Restock'
  },
};

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function ActivityItem({ event, isLatest }: { event: ActivityRibbonItem; isLatest?: boolean }) {
  const config = eventConfig[event.type] || eventConfig.NEW_LISTING;
  const displayText = event.display_text || event.payload?.title || 'Activity';
  
  return (
    <motion.div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 whitespace-nowrap rounded-full mx-1",
        isLatest && config.bg
      )}
      initial={isLatest ? { scale: 0.8, opacity: 0 } : false}
      animate={isLatest ? { scale: 1, opacity: 1 } : false}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <span className={cn(
        'flex items-center justify-center w-5 h-5 rounded-full',
        config.bg,
        config.color
      )}>
        {config.icon}
      </span>
      <span className="text-xs font-medium text-foreground max-w-[150px] truncate">
        {displayText}
      </span>
      <span className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded",
        isLatest ? "text-foreground bg-background/50" : "text-muted-foreground"
      )}>
        {getTimeAgo(event.created_at)}
      </span>
    </motion.div>
  );
}

export function ActivityRibbon({ events, isLoading }: ActivityRibbonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [latestEventId, setLatestEventId] = useState<string | null>(null);

  // Track latest event for highlight
  useEffect(() => {
    if (events.length > 0) {
      setLatestEventId(events[0].id);
      const timer = setTimeout(() => setLatestEventId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [events]);

  // Auto-scroll animation
  useEffect(() => {
    if (!containerRef.current || isPaused || events.length <= 3) return;
    
    const container = containerRef.current;
    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.3;
    
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
      <div className="px-4">
        <div className="h-10 bg-gradient-to-r from-secondary/50 via-secondary to-secondary/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  const displayEvents = [...events, ...events];

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-secondary/30 to-background" />
      
      {/* Gradient fade on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />
      
      {/* Live indicator */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2">
        <div className="relative">
          <Radio className="h-4 w-4 text-red-500" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </div>
        <span className="text-xs font-semibold text-foreground">Live</span>
      </div>
      
      {/* Scrolling content */}
      <div 
        ref={containerRef}
        className="relative flex items-center overflow-x-hidden py-2 pl-24"
      >
        <AnimatePresence mode="popLayout">
          {displayEvents.map((event, index) => (
            <ActivityItem 
              key={`${event.id}-${index}`} 
              event={event} 
              isLatest={event.id === latestEventId && index < events.length}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ActivityRibbon;
