import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Blocks, 
  Compass, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Search, 
  SlidersHorizontal,
  ArrowUpRight, 
  ShieldCheck, 
  Info, 
  Zap, 
  Layers,
  Power,
  PackageCheck,
  ShoppingBag,
  Newspaper
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlugins } from '../../context/PluginsContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

export const PluginsPage: React.FC = () => {
  const { plugins, isPluginActive, togglePlugin, isLoading } = usePlugins();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const activeCount = plugins.filter(p => isPluginActive(p.id)).length;
  const totalCount = plugins.length;

  const filteredPlugins = plugins.filter(plugin => {
    const active = isPluginActive(plugin.id);
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'active') return matchesSearch && active;
    if (statusFilter === 'inactive') return matchesSearch && !active;
    return matchesSearch;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 p-6 sm:p-10 shadow-2xl text-white">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <Blocks className="w-3.5 h-3.5 text-indigo-400" />
              Écosystème Modulaire FUS
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Gestion des Plugins & Extensions
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Personnalisez l’espace de travail du club en activant ou désactivant les modules selon vos besoins opérationnels.
            </p>
          </div>

          {/* STATS QUICK PILLS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md self-start md:self-auto">
            <div className="px-3 py-2 text-center border-r border-white/10">
              <span className="text-xs text-slate-400 block font-medium">Total</span>
              <span className="text-2xl font-black text-white">{totalCount}</span>
            </div>
            <div className="px-3 py-2 text-center border-r border-white/10 sm:border-r">
              <span className="text-xs text-emerald-400 block font-medium">Actifs</span>
              <span className="text-2xl font-black text-emerald-400">{activeCount}</span>
            </div>
            <div className="col-span-2 sm:col-span-1 px-3 py-2 text-center">
              <span className="text-xs text-indigo-300 block font-medium">Architecture</span>
              <span className="text-sm font-bold text-indigo-200 mt-1 block">Modulaire</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR (SEARCH & FILTERS) */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input 
            placeholder="Rechercher un plugin, un tag..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'all' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'active' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Actifs ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'inactive' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Désactivés ({totalCount - activeCount})
          </button>
        </div>
      </div>

      {/* PLUGINS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredPlugins.map((plugin) => {
            const active = isPluginActive(plugin.id);
            return (
              <motion.div
                key={plugin.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
              >
                <Card className={`relative overflow-hidden border-2 transition-all duration-300 rounded-2xl shadow-sm ${
                  active 
                    ? 'border-emerald-500/40 bg-white hover:shadow-md hover:border-emerald-500/60' 
                    : 'border-slate-200 bg-slate-50/70 opacity-80 hover:opacity-100 hover:border-slate-300'
                }`}>
                  {/* Top glowing bar */}
                  <div className={`h-1.5 w-full ${active ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500' : 'bg-slate-300'}`} />

                  <CardContent className="p-6 sm:p-7 space-y-6">
                    {/* CARD HEADER */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          active 
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50' 
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          <Compass className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                              {plugin.name}
                            </h2>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-black tracking-wide">
                              {plugin.version}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Module Sportif & Détection
                          </p>
                        </div>
                      </div>

                      {/* TOGGLE SWITCH */}
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold uppercase tracking-wider ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {active ? 'Activé' : 'Désactivé'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePlugin(plugin.id)}
                          disabled={isLoading}
                          aria-pressed={active}
                          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                            active ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        >
                          <span className="sr-only">Activer ou désactiver {plugin.name}</span>
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              active ? 'translate-x-7' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* DESCRIPTION */}
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {plugin.description}
                    </p>

                    {/* FEATURES INCLUDED */}
                    <div className="space-y-2 bg-slate-50/90 rounded-xl p-4 border border-slate-100">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Fonctionnalités incluses dans la v1 :
                      </div>
                      <ul className="grid grid-cols-1 gap-1.5 pt-1">
                        {plugin.features.map((feat, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${active ? 'text-emerald-500' : 'text-slate-400'}`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* TAGS */}
                    <div className="flex flex-wrap gap-1.5">
                      {plugin.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* CARD FOOTER ACTIONS */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs">
                        {active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Visible dans la barre latérale
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Masqué de la barre latérale
                          </span>
                        )}
                      </div>

                      {active ? (
                        <Button
                          onClick={() => navigate(plugin.path)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 rounded-xl shadow-sm"
                        >
                          Ouvrir le module
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => togglePlugin(plugin.id)}
                          className="text-xs text-slate-600 hover:text-emerald-700 hover:border-emerald-300 rounded-xl"
                        >
                          <Power className="w-3.5 h-3.5 mr-1" />
                          Activer ce plugin
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* ROADMAP / PREVIEW EXTENSIONS CARDS */}
        <Card className="border border-dashed border-slate-300 bg-slate-50/50 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
                Bientôt disponible
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Store & Boutique Merchandising
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Module e-commerce club pour maillots, équipements officiels et gestion des commandes supporters.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-4 border-t border-slate-200/60">
            <Info className="w-3.5 h-3.5" />
            Extensible via l’écosystème de plugins FUS
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PluginsPage;
