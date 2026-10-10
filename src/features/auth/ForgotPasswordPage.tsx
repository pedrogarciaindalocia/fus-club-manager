import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
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

        {sent ? (
          /* État : email envoyé */
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black mb-2 text-foreground">Email envoyé !</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-xs mx-auto">
              Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe. Le lien expire dans 1 heure.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        ) : (
          /* Formulaire */
          <>
            <h1 className="text-3xl font-black text-foreground mb-1">Mot de passe oublié</h1>
            <p className="text-muted-foreground text-sm mb-8">
              Entrez votre email et nous vous enverrons un lien de réinitialisation.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
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

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Envoi en cours…</>
                ) : (
                  'Envoyer le lien de réinitialisation'
                )}
              </Button>
            </form>

            <Link
              to="/login"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-6 transition-colors w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
