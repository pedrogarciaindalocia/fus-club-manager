import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const goals = [
  { id: 'goal-revenue', value: 78, label: 'Revenue', sub: '$78K / $100K', color: '#e03d3d' },
  { id: 'goal-users', value: 61, label: 'New Users', sub: '6.1K / 10K', color: '#3b82f6' },
  { id: 'goal-retention', value: 84, label: 'Retention', sub: '84% avg.', color: '#10b981' },
  { id: 'goal-nps', value: 92, label: 'NPS Score', sub: '92 / 100', color: '#8b5cf6' },
];

const GoalItem: React.FC<{ label: string; value: number; sub: string; color: string; idx: number }> = ({
  label, value, sub, color, idx
}) => {
  const data = [
    { value: value },
    { value: 100 - value },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative w-24 h-24">
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={40}
              startAngle={90}
              endAngle={450}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              animationBegin={400 + idx * 100}
              animationDuration={1500}
            >
              <Cell fill={color} />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-foreground leading-none">{value}%</span>
        </div>
      </div>
      <div className="text-center mt-1">
        <p className="text-[10px] font-bold text-foreground uppercase tracking-widest">{label}</p>
        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
};

const GoalTracker: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.5 }}
    id="goal-tracker-card"
  >
    <Card className="h-full hover:shadow-md transition-shadow border">
      <CardHeader className="flex-row items-center justify-between pb-6">
        <div className="space-y-1">
          <CardTitle className="text-lg tracking-tight flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Goals Tracker
          </CardTitle>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Q1 targets & metrics</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold uppercase tracking-wider">
          <TrendingUp className="w-3 h-3" />
          On Track
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {goals.map((g, i) => (
            <GoalItem
              key={g.id}
              label={g.label}
              value={g.value}
              sub={g.sub}
              color={g.color}
              idx={i}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default GoalTracker;
