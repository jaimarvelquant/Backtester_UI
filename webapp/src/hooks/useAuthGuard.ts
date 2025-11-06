import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';

export function useAuthGuard(shouldProtect = true) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!shouldProtect) {
      return;
    }
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [isAuthenticated, location.pathname, navigate, shouldProtect]);
}
