import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

/**
 * Access the authenticated session from any component inside AuthProvider.
 *
 * Throws if used outside of AuthProvider — this is intentional so that
 * missing the provider wrapper is caught immediately at development time.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
