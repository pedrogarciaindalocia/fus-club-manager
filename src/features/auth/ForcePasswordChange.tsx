import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

const ForcePasswordChange: React.FC = () => {
  const { authState } = usePermissions();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If not authenticated at all, redirect to login
  if (!authState.loading && !authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If already authenticated and force_password_change is false, redirect to dashboard
  if (!authState.loading && authState.isAuthenticated && !authState.user?.force_password_change) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    try {
      // Update password in Auth
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      
      if (updateError) {
        throw updateError;
      }

      // If successful, update user_profiles to remove the force_password_change flag
      if (authState.user?.id) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ force_password_change: false })
          .eq('id', authState.user.id);

        if (profileError) {
           console.error("Error updating profile flag:", profileError);
           // Continuing anyway because auth update succeeded
        }
      }

      toast.success("Mot de passe mis à jour avec succès.");
      
      // Need to reload the app to refresh user_profiles in context, or wait for it
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-amber-50 p-8 border-b border-amber-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-amber-900 mb-2">Sécurité requise</h1>
          <p className="text-amber-700/80 text-sm font-medium">
            Il s'agit de votre première connexion (ou votre mot de passe a été réinitialisé). Vous devez modifier votre mot de passe avant d'accéder à l'application.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <KeyRound className="w-3 h-3" /> Nouveau mot de passe
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 bg-slate-50"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <KeyRound className="w-3 h-3" /> Confirmer le nouveau mot de passe
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 bg-slate-50"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 font-bold text-base shadow-lg shadow-primary/20"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Mise à jour...</>
            ) : (
              'Enregistrer et Continuer'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
