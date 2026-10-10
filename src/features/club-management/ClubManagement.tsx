import React from 'react';
import { useClubData } from '../../hooks/useClubData';
import { useCompetitions } from '../../hooks/useCompetitions';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Settings, Plus, MapPin, Globe, History, LayoutPanelLeft } from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';

const ClubManagement: React.FC = () => {
  const { mainClub, opponentClubs, isLoading: clubLoading } = useClubData();
  const { stadiums, isLoading: competitionsLoading } = useCompetitions();

  const isLoading = clubLoading || competitionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <Skeleton className="lg:col-span-8 h-96 rounded-[2.5rem]" />
           <Skeleton className="lg:col-span-4 h-96 rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase italic">Club Management</h2>
          <p className="text-muted-foreground text-sm font-medium">Main club settings and rival database</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]">
            <Settings className="w-4 h-4" />
            Club Profile
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]">
            <Plus className="w-4 h-4" />
            Add Rival Club
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Club Identity Card */}
        <Card className="lg:col-span-12 border shadow-lg overflow-hidden glass relative rounded-[2.5rem]">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <div className="w-40 h-40 rounded-[2.5rem] bg-primary flex items-center justify-center text-white text-6xl font-black italic shadow-2xl shadow-primary/30 group-hover:scale-105 transition-transform duration-500">
                  {mainClub?.club_name?.[0] || 'C'}
                </div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xl border border-secondary text-primary">
                  <Globe className="w-6 h-6" />
                </div>
              </div>
              
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="space-y-1">
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <h3 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">{mainClub?.club_name}</h3>
                    <Badge className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest px-3 py-1 shadow-sm italic text-[10px]">MAIN CLUB</Badge>
                  </div>
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center md:justify-start gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> {mainClub?.city}, {mainClub?.country}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white/50 border border-secondary/50 shadow-sm">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Crest Color</p>
                    <div className="flex items-center gap-2">
                       <div className="w-4 h-4 rounded-full bg-primary" />
                       <span className="text-sm font-black uppercase tracking-tighter italic text-foreground">Elite</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/50 border border-secondary/50 shadow-sm">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Stadium</p>
                    <p className="text-sm font-black text-foreground truncate uppercase italic">{stadiums[0]?.name || 'No Stadium'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/50 border border-secondary/50 shadow-sm">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Capacity</p>
                    <p className="text-xl font-black text-foreground tracking-tighter">
                      {stadiums[0]?.capacity ? `${(stadiums[0].capacity / 1000).toFixed(1)}k` : '--'}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/50 border border-secondary/50 shadow-sm">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                    <p className="text-xl font-black text-emerald-500 tracking-tighter">PRO</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rival Clubs Grid */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black uppercase italic tracking-tighter">Rival Clubs</h4>
            <Badge variant="secondary" className="px-3 py-1 font-black bg-secondary/50 text-[10px] uppercase tracking-widest border-none">DATABASE: {opponentClubs.length}</Badge>
          </div>
          
          {opponentClubs.length === 0 ? (
            <Card className="border border-dashed border-secondary bg-secondary/5 p-10 flex flex-col items-center justify-center text-center rounded-[2.5rem]">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground mb-4">
                 <History className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] italic">No rival clubs registered in the database.</p>
              <Button variant="ghost" className="mt-4 text-primary font-black uppercase tracking-widest text-[10px] hover:bg-primary/5">Add First Opponent</Button>
            </Card>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opponentClubs.slice(0, 4).map(club => (
                  <Card key={club.id} className="border shadow-sm p-5 bg-white rounded-2xl hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-secondary/30 border border-secondary p-1 flex items-center justify-center">
                          {club.logo_url ? <img src={club.logo_url} className="w-full h-full object-contain" /> : <Globe className="w-6 h-6 opacity-20" />}
                       </div>
                       <div>
                          <p className="font-black uppercase tracking-tight text-sm truncate max-w-[150px]">{club.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{club.city}</p>
                       </div>
                    </div>
                  </Card>
                ))}
             </div>
          )}
        </div>

        {/* Stadiums Overview */}
        <div className="lg:col-span-4 space-y-6">
           <div className="flex items-center justify-between">
            <h4 className="text-lg font-black uppercase italic tracking-tighter">Our Stadiums</h4>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-3">
            {stadiums.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-secondary rounded-2xl">
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">No venues configured</p>
              </div>
            )}
            {stadiums.map(stadium => (
              <Card key={stadium.id} className="border shadow-sm p-4 hover:shadow-md transition-all group overflow-hidden rounded-2xl bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <LayoutPanelLeft className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-black text-sm uppercase tracking-tight">{stadium.name}</h5>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stadium.city} • {stadium.capacity ? `${(stadium.capacity/1000).toFixed(1)}k` : '--'} Cap.</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubManagement;
