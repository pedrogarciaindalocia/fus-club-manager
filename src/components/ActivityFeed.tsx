import React from 'react';
import { 
  ArrowUp, 
  Ticket, 
  BarChart, 
  UserMinus, 
  UserPlus, 
  Activity,
  MoreVertical
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

const activityFeed = [
  {
    id: 'act-1',
    user: 'Sarah K.',
    action: 'upgraded to Enterprise Plan',
    time: '2 min ago',
    initials: 'SK',
    color: '#e03d3d',
    icon: ArrowUp,
  },
  {
    id: 'act-2',
    user: 'Tom R.',
    action: 'submitted a support ticket',
    time: '14 min ago',
    initials: 'TR',
    color: '#3b82f6',
    icon: Ticket,
  },
  {
    id: 'act-3',
    user: 'Analytics Bot',
    action: 'generated weekly report',
    time: '1 hr ago',
    initials: 'AB',
    color: '#10b981',
    icon: BarChart,
  },
  {
    id: 'act-4',
    user: 'Mike L.',
    action: 'cancelled subscription',
    time: '3 hr ago',
    initials: 'ML',
    color: '#f59e0b',
    icon: UserMinus,
  },
  {
    id: 'act-5',
    user: 'Julia F.',
    action: 'invited 3 new team members',
    time: '5 hr ago',
    initials: 'JF',
    color: '#8b5cf6',
    icon: UserPlus,
  },
];

const ActivityFeed: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay: 0.5 }}
    id="activity-feed-card"
  >
    <Card className="h-full hover:shadow-md transition-shadow border">
      <CardHeader className="flex-row items-center justify-between pb-6">
        <div className="space-y-1">
          <CardTitle className="text-lg tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Activity Feed
          </CardTitle>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Real-time system events</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse-slow" />
          Live
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activityFeed.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div 
              key={item.id} 
              id={item.id} 
              className="flex items-start gap-3 group relative cursor-pointer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 + idx * 0.1 }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 group-hover:scale-105 transition-transform shadow-md"
                style={{ background: item.color }}
              >
                {item.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground tracking-tight leading-tight">
                  <span className="font-bold text-foreground">{item.user}</span>{' '}
                  <span className="text-muted-foreground opacity-90">{item.action}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("inline-flex p-0.5 rounded-md text-white")} style={{ background: item.color }}>
                    <Icon className="w-2.5 h-2.5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{item.time}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              
              {idx < activityFeed.length - 1 && (
                <div className="absolute left-[17.5px] top-10 bottom-[-16px] w-[2px] bg-secondary/80 -z-10 group-last:hidden" />
              )}
            </motion.div>
          );
        })}
        <Button variant="outline" size="sm" className="w-full mt-2 h-9 rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors ring-1 ring-black/5">
          View all activity
        </Button>
      </CardContent>
    </Card>
  </motion.div>
);

export default ActivityFeed;
