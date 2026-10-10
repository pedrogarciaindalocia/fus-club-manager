import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface PlaceholderPageProps {
  name: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ name }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
    <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-8 text-primary shadow-lg shadow-primary/5">
      <LayoutGrid className="w-10 h-10" />
    </div>
    <h2 className="text-3xl font-bold tracking-tight text-foreground">{name}</h2>
    <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
      This analytical module is currently being optimized. Please check back later.
    </p>
  </div>
);

export default PlaceholderPage;
