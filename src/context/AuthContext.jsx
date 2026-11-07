
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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(null);

  // Always holds the latest login challenge,
  // even inside an older MSG91 callback.
  const pendingLoginRef = useRef(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      pendingLoginRef.current = null;
      setPendingLogin(null);
      setSession(null);
      setSessionExpired(true);
    });

    return () => setUnauthorizedHandler(() => {});
  }, []);

  // STEP 1: Verify passwords and request OTP challenge.
  const login = async (phone, password, secondPassword, loginType) => {
    const result = await apiLogin(
      phone,
      password,
      secondPassword
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
  return useContext(AuthContext);
}
