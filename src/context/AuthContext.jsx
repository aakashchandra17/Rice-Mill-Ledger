
import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, setUnauthorizedHandler } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      setSessionExpired(true);
    });
  }, []);

  const login = async (phone, loginType) => {
    const { token, user } = await apiLogin(phone);

    // The backend role determines access.
    // owner = Miller, party = Commissiondhar.
    if (user.role !== 'owner' && user.role !== 'party') {
      throw new Error('Unsupported account role. Please contact support.');
    }

    // Check that the selected login matches the account's role.
    if (loginType !== user.role) {
      throw Object.assign(new Error('Please select the correct login type.'), {
        wrongType: true,
      });
    }

    setSessionExpired(false);
    setSession({ token, user });

    return user;
  };

  const logout = () => {
    setSessionExpired(false);
    setSession(null);
  };

  const value = {
    token: session?.token ?? null,
    user: session?.user ?? null,
    role: session?.user?.role ?? null,
    sessionExpired,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
