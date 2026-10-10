import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/**
 * Supabase envoie un lien de la forme :
 *   /reset-password#access_token=...&type=recovery
 * onAuthStateChange capture l'événement RECOVERY et établit la session.
 * L'utilisateur peut alors appeler updateUser({ password }) avec ce token.
 */
const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Attendre que Supabase traite le token de récupération dans le hash
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Si on arrive sur la page avec un token déjà traité (refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/login" className="flex items-center gap-2 mb-10 w-fit">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tight">
            Fusc<span className="text-primary">Club</span>
          </span>
        </Link>

        {done ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black mb-2 text-foreground">Mot de passe mis à jour !</h2>
            <p className="text-muted-foreground text-sm">
              Vous allez être redirigé vers la page de connexion…
            </p>
          </div>
        ) : !sessionReady ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-black mb-2 text-foreground">Lien invalide</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Ce lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.
            </p>
            <Link to="/forgot-password" className="text-primary font-semibold hover:underline text-sm">
              Demander un nouveau lien
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black text-foreground mb-1">Nouveau mot de passe</h1>
            <p className="text-muted-foreground text-sm mb-8">
              Choisissez un mot de passe sécurisé d'au moins 8 caractères.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="password">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    disabled={loading}
                    className="h-12 pr-12"
                    autoComplete="new-password"
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

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="confirm">
                  Confirmer le mot de passe
                </label>
                <Input
                  id="confirm"
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="h-12"
                  autoComplete="new-password"
                />
              </div>

              {/* Indicateur de force */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[8, 12, 16].map((len, i) => (
                      <div
                        key={len}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= len
                            ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-green-500'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {password.length < 8 ? 'Trop court' : password.length < 12 ? 'Acceptable' : password.length < 16 ? 'Bon' : 'Excellent'}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Mise à jour…</>
                ) : (
                  'Enregistrer le nouveau mot de passe'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
