import { createContext, useContext, useState } from 'react';
import { login as apiLogin } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null); // memory only, never localStorage

  const login = async phone => {
    const newToken = await apiLogin(phone);
    setToken(newToken);
  };
  const logout = () => setToken(null);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}