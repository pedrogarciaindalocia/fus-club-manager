import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsContext';
import { FusLogoLoader } from './ui/FusLogoLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Permission requise pour accéder à la route (optionnel) */
  requiredPermission?: string;
  /** Route de redirection si permission insuffisante (défaut : '/') */
  fallback?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  fallback = '/',
}) => {
  const { authState, can } = usePermissions();
  const location = useLocation();
  const [forceReady, setForceReady] = React.useState(false);

  // Sécurité anti-blocage : ne jamais bloquer l'écran plus de 2 secondes
  React.useEffect(() => {
    if (authState.loading) {
      const timer = setTimeout(() => {
        setForceReady(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [authState.loading]);

  // Chargement initial de la session
  if (authState.loading && !forceReady) {
    return (
      <FusLogoLoader
        fullScreen
        size="xl"
        label="Vérification de la session…"
      />
    );
  }

  // Non authentifié → page de connexion (avec retour après login)
  if (!authState.isAuthenticated) {
    if (import.meta.env.DEV) {
      // En DEV, si aucune permission spécifique n'est exigée ou si la permission est accordée, permettre l'accès direct
      if (!requiredPermission || can(requiredPermission)) {
        return <>{children}</>;
      }
      return <Navigate to={fallback} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // US-DASH-34: Forçage du renouvellement du mot de passe à la première connexion
  if (authState.user?.force_password_change) {
    return <Navigate to="/force-password-change" replace />;
  }

  // Contrôle de permission RBAC (Proxy / Guard)
  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
