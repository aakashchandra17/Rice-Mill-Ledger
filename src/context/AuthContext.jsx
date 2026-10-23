import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, setUnauthorizedHandler } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null); // memory only, never localStorage
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setSessionExpired(true);
    });
  }, []);

  const login = async phone => {
    const newToken = await apiLogin(phone);
    setSessionExpired(false);
    setToken(newToken);
  };

  const logout = () => {
    setSessionExpired(false);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, sessionExpired, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}