import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';


const revenueData = {
  Weekly: [
    { label: 'Mon', value: 6500 },
    { label: 'Tue', value: 4200 },
    { label: 'Wed', value: 8800 },
    { label: 'Thu', value: 5700 },
    { label: 'Fri', value: 7500 },
    { label: 'Sat', value: 9200 },
    { label: 'Sun', value: 4800 },
  ],
  Monthly: [
    { label: 'Jan', value: 55000 },
    { label: 'Feb', value: 70000 },
    { label: 'Mar', value: 82000 },
    { label: 'Apr', value: 60000 },
    { label: 'May', value: 95000 },
    { label: 'Jun', value: 78000 },
    { label: 'Jul', value: 88000 },
    { label: 'Aug', value: 72000 },
    { label: 'Sep', value: 90000 },
    { label: 'Oct', value: 65000 },
    { label: 'Nov', value: 85000 },
    { label: 'Dec', value: 100000 },
  ],
  Yearly: [
    { label: '2020', value: 450000 },
    { label: '2021', value: 620000 },
    { label: '2022', value: 750000 },
    { label: '2023', value: 880000 },
    { label: '2024', value: 950000 },
    { label: '2025', value: 1000000 },
  ],
};

type Period = 'Weekly' | 'Monthly' | 'Yearly';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border rounded-xl shadow-xl p-3 ring-1 ring-black/5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-2">{label}</p>
        <p className="text-sm font-bold text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const RevenueChart: React.FC = () => {
  const [period, setPeriod] = useState<Period>('Monthly');
  const data = revenueData[period];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow border">
        <CardHeader className="flex-row items-center justify-between pb-8">
          <div className="space-y-1">
            <CardTitle className="text-lg tracking-tight">Revenue Overview</CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              Current growth: <span className="text-primary font-bold">+14.2%</span> from last period
            </p>
          </div>
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl ring-1 ring-black/5">
            {(['Weekly', 'Monthly', 'Yearly'] as Period[]).map(p => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className={cn(
                  "h-8 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all",
                  period === p && "shadow-md shadow-primary/20"
                )}
              >
                {p}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={350} debounce={50}>
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  </linearGradient>
                  {/* For inactive bars */}
                  <linearGradient id="mutedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `$${val > 999 ? val / 1000 + 'k' : val}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 4, 4]}
                  barSize={32}
                  animationBegin={200}
                  animationDuration={1200}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.value === Math.max(...data.map(d => d.value)) ? 'url(#barGradient)' : 'hsl(var(--primary) / 0.15)'}
                      className="hover:fill-primary transition-all duration-300"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RevenueChart;
