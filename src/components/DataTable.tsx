import React from 'react';
import { 
  Badge 
} from './ui/badge';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from './ui/table';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, Clock, XCircle, Filter, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface Transaction {
  id: string;
  name: string;
  provider: string;
  date: string;
  amount: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Processing';
}

const transactions: Transaction[] = [
  { id: '#4829', name: 'James Wilson', provider: 'Visa ending in 4921', date: 'Mar 29, 2026', amount: '$2,400.00', status: 'Completed' },
  { id: '#4828', name: 'Elena Gilbert', provider: 'Mastercard ending in 2910', date: 'Mar 28, 2026', amount: '$890.00', status: 'Completed' },
  { id: '#4827', name: 'Robert Downey', provider: 'Visa ending in 1184', date: 'Mar 28, 2026', amount: '$149.00', status: 'Pending' },
  { id: '#4826', name: 'Tasha Adams', provider: 'PayPal (tasha.a@ink.com)', date: 'Mar 27, 2026', amount: '$3,200.00', status: 'Processing' },
  { id: '#4825', name: 'Steve Jobs', provider: 'Visa ending in 0001', date: 'Mar 26, 2026', amount: '$890.00', status: 'Completed' },
  { id: '#4824', name: 'Bruce Wayne', provider: 'Amex ending in 9928', date: 'Mar 25, 2026', amount: '$2,400.00', status: 'Failed' },
];

const statusStyles: Record<Transaction['status'], { variant: any, icon: any }> = {
  Completed: { variant: 'success', icon: CheckCircle2 },
  Pending:   { variant: 'warning', icon: Clock },
  Failed:    { variant: 'destructive', icon: XCircle },
  Processing:{ variant: 'secondary', icon: Clock },
};

const DataTable: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      id="data-table-card"
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex-row items-center justify-between pb-8">
          <div className="space-y-1">
            <CardTitle>Recent Transactions</CardTitle>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Latest payments and status</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl text-xs font-bold uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </Button>
            <Button variant="default" size="sm" className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/20">
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-1">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="hover:bg-transparent border-t">
                <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px]">Client / Method</TableHead>
                <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px]">Transaction ID</TableHead>
                <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px]">Date</TableHead>
                <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px]">Amount</TableHead>
                <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
                <TableHead className="py-4 text-right pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const StatusIcon = statusStyles[t.status].icon;
                return (
                  <TableRow key={t.id} className="group transition-colors h-[68px]">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm tracking-tight mb-0.5">{t.name}</span>
                        <span className="text-[11px] text-muted-foreground font-medium">{t.provider}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[11px] font-mono font-bold text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">{t.id}</code>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-muted-foreground">{t.date}</TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-foreground tracking-tight">{t.amount}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusStyles[t.status].variant as any} className="gap-1.5 px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                        <StatusIcon className="w-3 h-3" />
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          <div className="flex items-center justify-between p-6 border-t mt-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Page 1 of 8</p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 w-12 rounded-lg font-bold text-[10px]">Prev</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg font-bold text-[10px] bg-primary/10 text-primary border-primary/20">1</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg font-bold text-[10px]">2</Button>
              <Button variant="outline" size="sm" className="h-8 w-12 rounded-lg font-bold text-[10px]">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DataTable;
