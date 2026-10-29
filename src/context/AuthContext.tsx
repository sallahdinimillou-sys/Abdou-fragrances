import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  user: any | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {};
  const signOut = async () => { setUser(null); };
  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: !!user,
        loading,
        error,
        signIn,
        signOut,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
