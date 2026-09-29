import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loginRequest, registerRequest, fetchCurrentUser } from '../services/api';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../utils/roles';

const STORAGE_KEY = 'civicpulse_auth';

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isCheckingSession: false,
  isStaff: false,
  isAdmin: false,
  isSuperAdmin: false,
  hasRole: () => false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const stored = readStoredAuth();
  const [user, setUser] = useState(stored?.user || null);
  const [token, setToken] = useState(stored?.token || null);
  // True while we re-validate a stored session against the server on first load,
  // so protected pages don't flash "access denied" or show stale roles.
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(stored?.token));

  const persist = (nextToken, nextUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // On first load, ask the server who we are. This picks up role changes made
  // by a super-admin and drops sessions for deactivated or deleted accounts.
  useEffect(() => {
    if (!stored?.token) return undefined;
    let cancelled = false;
    fetchCurrentUser()
      .then((response) => {
        if (!cancelled) persist(stored.token, response.data);
      })
      .catch((err) => {
        // Only clear the session when the server says it's invalid. A network
        // blip or cold-starting Render instance should not log people out.
        if (!cancelled && [401, 403, 404].includes(err?.response?.status)) logout();
      })
      .finally(() => {
        if (!cancelled) setIsCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
    // Runs once on mount, using the token read at that time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await loginRequest({ email, password });
    persist(response.data.token, response.data.user);
    return response.data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const response = await registerRequest({ name, email, password });
    persist(response.data.token, response.data.user);
    return response.data.user;
  }, []);

  const hasRole = useCallback((...roles) => Boolean(user && roles.includes(user.role)), [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        isCheckingSession,
        isStaff: Boolean(user && STAFF_ROLES.includes(user.role)),
        // admin or super_admin
        isAdmin: Boolean(user && ADMIN_ROLES.includes(user.role)),
        isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
        hasRole,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
