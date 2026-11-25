
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';

import {
  login as apiLogin,
  verifyOtp as apiVerifyOtp,
  setUnauthorizedHandler,
} from '../api';

const SESSION_STORAGE_KEY = 'grain_ledger_session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(null);

  // Always holds the latest login challenge,
  // even inside an older MSG91 callback.
  const pendingLoginRef = useRef(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      pendingLoginRef.current = null;
      setPendingLogin(null);
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {}
      setSession(null);
      setSessionExpired(true);
    });

    return () => setUnauthorizedHandler(() => {});
  }, []);

  // STEP 1: Verify credentials and request OTP challenge.
  const login = async (phone, password, loginType) => {
    const result = await apiLogin(
      phone,
      password
    );

    const loginDetails = {
      challengeId: result.challengeId,
      phone,
      loginType,
    };

    // Update ref immediately, without waiting for React.
    pendingLoginRef.current = loginDetails;
    setPendingLogin(loginDetails);

    setSession(null);
    setSessionExpired(false);

    return result;
  };

  // STEP 2: Verify MSG91 token with Grain Ledger backend.
  const verifyLoginOtp = async msg91AccessToken => {
    const currentLogin = pendingLoginRef.current;

    if (!currentLogin) {
      throw new Error(
        'Your login session has expired. Please log in again.'
      );
    }

    if (
      typeof msg91AccessToken !== 'string' ||
      !msg91AccessToken.trim()
    ) {
      throw new Error(
        'MSG91 verification token is missing. Please try again.'
      );
    }

    const { challengeId, loginType } = currentLogin;

    // This must call the Grain Ledger /verify-otp endpoint.
    const result = await apiVerifyOtp(
      challengeId,
      msg91AccessToken
    );

    if (!result?.token) {
      throw new Error(
        'The backend did not return a valid Grain Ledger token.'
      );
    }

    const newSession = {
      token: result.token,
      loginType,
    };

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch (err) {
      console.error('Failed to store session in localStorage:', err);
    }

    setSession(newSession);

    pendingLoginRef.current = null;
    setPendingLogin(null);
    setSessionExpired(false);

    return { loginType };
  };

  const cancelOtp = () => {
    pendingLoginRef.current = null;
    setPendingLogin(null);
  };

  const logout = () => {
    pendingLoginRef.current = null;
    setPendingLogin(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    setSession(null);
    setSessionExpired(false);
  };

  const value = {
    token: session?.token ?? null,
    user: null,
    role: session?.loginType ?? null,
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
  const context = useContext(AuthContext);
  return context || {};
}
