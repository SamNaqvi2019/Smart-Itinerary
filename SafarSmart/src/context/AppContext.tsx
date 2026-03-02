import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginUser, registerUser } from '../services/api';
import { migrateLegacyCosts } from '../services/storage';

interface User {
  id: string;
  email: string;
  name?: string;
  token?: string;
}

interface AppContextType {
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Migrate legacy 30,000 flat-rate costs on first mount
  useEffect(() => { migrateLegacyCosts(); }, []);

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await loginUser({ email, password });
      setUser({
        id: data.user.email,
        email: data.user.email,
        name: data.user.full_name,
        token: data.token,
      });
    } catch (error: any) {
      setAuthError(error?.message || 'Failed to sign in');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setAuthLoading(true);
    try {
      setUser(null);
    } catch (error: any) {
      setAuthError(error?.message || 'Failed to sign out');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await registerUser({ email, password, full_name: name });
      setUser({
        id: data.user.email,
        email: data.user.email,
        name: data.user.full_name,
        token: data.token,
      });
    } catch (error: any) {
      setAuthError(error?.message || 'Failed to sign up');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        authError,
        signIn,
        signOut,
        signUp,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

