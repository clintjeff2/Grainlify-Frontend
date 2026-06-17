import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, getAuthToken, setAuthToken, removeAuthToken } from '../api/client';
import { logger } from '../utils/logger';

export type UserRole = 'contributor' | 'maintainer' | 'admin' | null;

export interface User {
  id: string;
  role: string;
  github?: {
    login: string;
    avatar_url: string;
    name?: string;
    email?: string;
    location?: string;
    bio?: string;
    website?: string;
  };
}

interface AuthContextType {
  userRole: UserRole;
  userId: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    const token = getAuthToken();
    logger.debug('AuthContext - Checking authentication on mount');
    logger.debug('AuthContext - Token found:', token ? 'Yes' : 'No');

    if (token) {
      try {
        logger.debug('AuthContext - Fetching user profile...');
        const userData = await getCurrentUser();
        logger.debug('AuthContext - User profile received for ID:', userData.id);
        setUser(userData);
        setUserRole(userData.role as UserRole);
        setUserId(userData.id);
        logger.info('AuthContext - User authenticated', {
          role: userData.role,
          id: userData.id
        });
      } catch (error) {
        // Token is invalid, remove it
        logger.error('AuthContext - Auth check failed:', error instanceof Error ? error.message : error);
        removeAuthToken();
        setUser(null);
        setUserRole(null);
        setUserId(null);
      }
    } else {
      logger.debug('AuthContext - No token found, user not authenticated');
      setUser(null);
      setUserRole(null);
      setUserId(null);
    }
    setIsLoading(false);
    logger.debug('AuthContext - Loading complete');
  };

  // Check for existing token on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Keep auth state in sync when token changes (logout in same tab, 401s, etc).
  useEffect(() => {
    const onTokenEvent = (e: Event) => {
      const ce = e as CustomEvent<{ token: string | null }>;
      const token = ce.detail?.token ?? null;
      if (!token) {
        setUser(null);
        setUserRole(null);
        setUserId(null);
        return;
      }
      // Token was set/changed: refresh user.
      checkAuth();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'patchwork_jwt') return;
      if (!e.newValue) {
        setUser(null);
        setUserRole(null);
        setUserId(null);
        return;
      }
      checkAuth();
    };

    window.addEventListener('patchwork-auth-token', onTokenEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('patchwork-auth-token', onTokenEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = async (token: string) => {
    logger.debug('AuthContext - login() called');
    setAuthToken(token);
    logger.debug('AuthContext - Token saved to localStorage');

    try {
      logger.debug('AuthContext - Fetching user profile after login...');
      const userData = await getCurrentUser();
      logger.debug('AuthContext - User profile received for ID:', userData.id);
      setUser(userData);
      setUserRole(userData.role as UserRole);
      setUserId(userData.id);
      logger.info('AuthContext - Login successful for ID:', userData.id);
    } catch (error) {
      logger.error('AuthContext - Login failed:', error instanceof Error ? error.message : error);
      removeAuthToken();
      throw error;
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setUserRole(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        userRole,
        userId,
        user,
        isAuthenticated: !!user && !!getAuthToken(),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
