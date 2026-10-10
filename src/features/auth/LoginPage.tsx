import React, { useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Trophy, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

import { AuditLogger } from '../../services/auditLogger';

const LoginPage: React.FC = () => {
  const { authState } = usePermissions();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Déjà authentifié → redirige vers la page demandée
  if (!authState.loading && authState.isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      const msg = signInError.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : signInError.message;
      setError(msg);
      setLoading(false);

      // Log Login Failure
      await AuditLogger.log({
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        description: `Échec de connexion pour ${email} : ${msg}`,
        status: 'FAILED'
      });
    } else if (signInData?.user) {
      // Start unique audit session for user
      await AuditLogger.startSession(signInData.user.id, signInData.user.email ?? email, 'super_admin');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Panneau gauche – branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex-col justify-between p-12 relative overflow-hidden">
        {/* Cercles décoratifs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/5 rounded-full" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-black text-2xl tracking-tight">
            Fusc<span className="opacity-70">Club</span>
          </span>
        </div>

        {/* Accroche */}
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Gérez votre club<br />comme un champion.
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Tableau de bord complet pour la gestion sportive, technique<br />
            et administrative de votre club.
          </p>

          {/* Feature list */}
          <ul className="mt-8 space-y-3">
            {[
              'Gestion des joueurs & du staff',
              'Suivi live des matchs',
              'Statistiques avancées',
              'Accès basé sur les rôles (RBAC)',
            ].map(f => (
              <li key={f} className="flex items-center gap-3 text-white/80 text-sm font-medium">
                <ShieldCheck className="w-4 h-4 text-white/60 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-white/40 text-xs">© 2026 FuscClub — Tous droits réservés</p>
      </div>

      {/* Panneau droit – formulaire */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight">
              Fusc<span className="text-primary">Club</span>
            </span>
          </div>

          <h1 className="text-3xl font-black text-foreground mb-1">Connexion</h1>
          <p className="text-muted-foreground mb-8 text-sm">Accédez à votre espace de gestion</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="email">
                Adresse email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="coach@fuscclub.ma"
                required
                disabled={loading}
                className="h-12"
                autoComplete="email"
              />
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground" htmlFor="password">
                  Mot de passe
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                  tabIndex={-1}
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="h-12 pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 font-bold text-base shadow-lg shadow-primary/20"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Connexion en cours…</>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Pas encore de compte ?{' '}
            <span className="text-foreground font-medium">Contactez votre administrateur.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
