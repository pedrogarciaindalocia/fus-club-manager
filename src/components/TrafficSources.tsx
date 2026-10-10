import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { motion } from 'framer-motion';

interface MetricRowProps {
  label: string;
  value: number;
  color?: string;
  idx: number;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, color = 'hsl(var(--primary))', idx }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground">{value}%</span>
    </div>
    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
      <motion.div 
        className="h-full rounded-full" 
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
      />
    </div>
  </div>
);

const trafficSources = [
  { label: 'Organic Search', value: 64, color: '#e03d3d' },
  { label: 'Direct Traffic', value: 47, color: '#3b82f6' },
  { label: 'Social Media', value: 35, color: '#8b5cf6' },
  { label: 'Email Campaigns', value: 28, color: '#f59e0b' },
  { label: 'Referrals', value: 19, color: '#10b981' },
];

const TrafficSources: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay: 0.4 }}
    id="traffic-sources-card"
  >
    <Card className="h-full hover:shadow-md transition-shadow border">
      <CardHeader className="pb-8">
        <CardTitle className="text-lg tracking-tight">Traffic Sources</CardTitle>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Monthly distribution overview</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {trafficSources.map((s, i) => (
          <MetricRow key={i} label={s.label} value={s.value} color={s.color} idx={i} />
        ))}
      </CardContent>
    </Card>
  </motion.div>
);

export default TrafficSources;
