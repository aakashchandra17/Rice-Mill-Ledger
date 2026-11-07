
import { createContext, useContext, useState, useEffect } from 'react';
import {
  login as apiLogin,
  verifyOtp as apiVerifyOtp,
  setUnauthorizedHandler,
} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      setSessionExpired(true);
      setPendingLogin(null);
    });

    return () => setUnauthorizedHandler(() => {});
  }, []);

  // STEP 1: Verify passwords and request an OTP challenge.
  const login = async (phone, password, secondPassword, loginType) => {
    const result = await apiLogin(phone, password, secondPassword);

    setPendingLogin({
      challengeId: result.challengeId,
      phone,
      loginType,
    });

    setSessionExpired(false);

    return result;
  };

  // STEP 2: Send the MSG91 access token to the backend.
  const verifyLoginOtp = async msg91AccessToken => {
    if (!pendingLogin) {
      throw new Error('Your login session has expired. Please log in again.');
    }

    if (!msg91AccessToken) {
      throw new Error('MSG91 verification token is missing. Please try again.');
    }

    const { challengeId, phone, loginType } = pendingLogin;

    const { token, user } = await apiVerifyOtp(
      challengeId,
      msg91AccessToken,
      phone
    );

    // Backend JWT roles:
    // owner = Miller
    // party = Commissiondar
    // admin = Grain Ledger Admin
    const allowedRoles = ['owner', 'party', 'admin'];

    if (!user || !allowedRoles.includes(user.role)) {
      setPendingLogin(null);
      throw new Error(
        'Your account has an unsupported role. Please contact support.'
      );
    }

    // Check that the selected account type matches the backend role.
    if (loginType && loginType !== user.role) {
      setPendingLogin(null);
      throw Object.assign(
        new Error('Please select the correct account type and log in again.'),
        { wrongType: true }
      );
    }

    setSession({ token, user });
    setPendingLogin(null);
    setSessionExpired(false);

    return user;
  };

  const cancelOtp = () => {
    setPendingLogin(null);
  };

  const logout = () => {
    setPendingLogin(null);
    setSession(null);
    setSessionExpired(false);
  };

  const value = {
    token: session?.token ?? null,
    user: session?.user ?? null,
    role: session?.user?.role ?? null,
    sessionExpired,
    pendingLogin,
    login,
    verifyLoginOtp,
    cancelOtp,
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
