import React from 'react';
import { AlertCircle, RefreshCcw, Database } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  type?: 'error' | 'empty' | 'config';
}

const ErrorEmptyState: React.FC<ErrorStateProps> = ({ 
  title, 
  message, 
  onRetry, 
  type = 'error' 
}) => {
  const isConfig = type === 'config';
  const isEmpty = type === 'empty';

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white/40 backdrop-blur-md rounded-[3rem] border border-dashed border-slate-200">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${
        isConfig ? 'bg-amber-100 text-amber-600' : 
        isEmpty ? 'bg-slate-100 text-slate-400' : 
        'bg-red-50 text-red-500'
      }`}>
        {isConfig ? <Database className="w-10 h-10" /> : 
         isEmpty ? <Database className="w-10 h-10 opacity-20" /> : 
         <AlertCircle className="w-10 h-10" />}
      </div>
      
      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">
        {title || (isConfig ? 'Configuration Requise' : isEmpty ? 'Aucune donnée' : 'Oups ! Un problème est survenu')}
      </h3>
      
      <p className="text-slate-500 max-w-sm font-medium mb-8">
        {message || (isConfig 
          ? "Vérifiez que votre club est correctement configuré et que vous avez accès aux données." 
          : isEmpty 
          ? "Il semble qu'il n'y ait pas encore de données à afficher ici." 
          : "Nous n'avons pas pu charger les données. Vérifiez votre connexion ou contactez l'assistance.")}
      </p>

      {onRetry && (
        <Button 
          onClick={onRetry}
          variant="outline"
          className="gap-2 rounded-2xl px-8 font-bold border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
        >
          <RefreshCcw className="w-4 h-4" />
          Réessayer
        </Button>
      )}
    </div>
  );
};

export default ErrorEmptyState;
