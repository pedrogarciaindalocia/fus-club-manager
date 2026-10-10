import React from 'react';
import { Blocks, Power, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlugins } from '../../context/PluginsContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

interface PluginDisabledViewProps {
  pluginId: string;
  pluginName: string;
}

export const PluginDisabledView: React.FC<PluginDisabledViewProps> = ({
  pluginId,
  pluginName
}) => {
  const navigate = useNavigate();
  const { setPluginActive, isLoading } = usePlugins();

  const handleActivate = async () => {
    await setPluginActive(pluginId, true);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 to-indigo-500" />
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200/60 shadow-sm">
            <Blocks className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              Module Désactivé
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {pluginName}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              Ce plugin est actuellement désactivé pour le club. Activez-le dans le gestionnaire de plugins pour restaurer l'accès.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleActivate}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md gap-2"
            >
              <Power className="w-4 h-4" />
              Activer le module maintenant
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/plugins')}
              className="rounded-xl border-slate-200 hover:bg-slate-50 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Catalogue des Plugins
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PluginDisabledView;
