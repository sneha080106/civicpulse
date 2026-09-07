import { createContext, useContext, useState, useCallback } from 'react';
import { loginRequest, registerRequest } from '../services/api';

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
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const stored = readStoredAuth();
  const [user, setUser] = useState(stored?.user || null);
  const [token, setToken] = useState(stored?.token || null);

  const persist = (nextToken, nextUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
    setToken(nextToken);
    setUser(nextUser);
  };

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

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        isAdmin: user?.role === 'admin',
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
