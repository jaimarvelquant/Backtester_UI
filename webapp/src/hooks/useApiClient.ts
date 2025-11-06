import { useMemo } from 'react';
import { useAuth } from '@context/AuthContext';
import { ApiClient } from '@services/apiClient';

export function useApiClient(): ApiClient {
  const { token } = useAuth();

  return useMemo(() => new ApiClient(() => token), [token]);
}
