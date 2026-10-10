import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

interface StatCardProps {
  id: string;
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ElementType; // Using Lucide icon type
  variant?: 'default' | 'red';
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ id, label, value, change, positive, icon, variant = 'default', delay = 0 }) => {
  const isRed = variant === 'red';
  const Icon = icon;

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      whileHover={{ y: -5 }}
      className="flex-1"
    >
      <Card 
        className={cn(
          "h-full transition-all duration-300 relative group overflow-hidden border shadow-sm hover:shadow-xl ring-1 ring-black/5",
          isRed ? "bg-primary text-white border-primary shadow-primary/20" : "bg-white hover:bg-secondary/20"
        )}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-8">
            <div
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md",
                isRed ? "bg-white/20 text-white" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
            
            <div className="flex items-center gap-1.5">
              <Badge 
                variant={isRed ? "outline" : (positive ? "success" : "destructive") as any}
                className={cn(
                  "gap-1 px-2.5 py-1 font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm border",
                  isRed && "bg-white/10 text-white border-white/20"
                )}
              >
                {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {change}
              </Badge>
              <button className={cn("inline-flex p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity", 
                isRed ? "hover:bg-white/10 text-white/50 hover:text-white" : "hover:bg-secondary text-muted-foreground")}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-1 relative z-10">
            <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-80", isRed ? "text-white/80" : "text-muted-foreground tracking-widest font-bold")}>
              {label}
            </p>
            <p className={cn("text-3xl font-bold tracking-tighter", isRed ? "text-white" : "text-foreground")}>
              {value}
            </p>
          </div>
          
          {/* Abstract background elements */}
          {isRed ? (
            <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-l from-white/10 to-transparent pointer-events-none opacity-50 -skew-x-12 translate-x-12 group-hover:translate-x-8 transition-transform duration-700" />
          ) : (
            <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatCard;
