import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredSessionId,
  getStoredUser,
  loginRequest,
  logoutRequest,
  meRequest,
  persistAuthSession,
  refreshRequest,
} from '../api/client';

export const AuthContext = createContext(null);

function normalizeBackendUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    fullName: user.full_name || '',
    email: user.email || '',
    username: user.username || user.email || '',
    phone: user.phone || '',
    role: user.role || '',
    status: user.status || '',
  };
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => normalizeBackendUser(getStoredUser()));
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((payload) => {
    const normalizedUser = normalizeBackendUser(payload?.user);
    persistAuthSession({
      access_token: payload?.access_token,
      refresh_token: payload?.refresh_token,
      session_id: payload?.session_id,
      user: normalizedUser,
    });
    setUser(normalizedUser);
    return normalizedUser;
  }, []);

  const clearSession = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const session_id = Number(getStoredSessionId() || 0);
    const refresh_token = getStoredRefreshToken();

    if (!session_id || !refresh_token) {
      clearSession();
      return null;
    }

    try {
      const payload = await refreshRequest({ session_id, refresh_token });
      const normalizedUser = applySession(payload);
      return {
        accessToken: payload.access_token,
        user: normalizedUser,
      };
    } catch (error) {
      clearSession();
      return null;
    }
  }, [applySession, clearSession]);

  const loadCurrentUser = useCallback(async () => {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      const me = await meRequest(accessToken);
      const normalizedUser = normalizeBackendUser(me);
      persistAuthSession({
        access_token: accessToken,
        refresh_token: getStoredRefreshToken(),
        session_id: getStoredSessionId(),
        user: normalizedUser,
      });
      setUser(normalizedUser);
    } catch (error) {
      const refreshed = await refreshSession();
      if (!refreshed?.accessToken) {
        clearSession();
      } else {
        try {
          const me = await meRequest(refreshed.accessToken);
          const normalizedUser = normalizeBackendUser(me);
          persistAuthSession({
            access_token: refreshed.accessToken,
            refresh_token: getStoredRefreshToken(),
            session_id: getStoredSessionId(),
            user: normalizedUser,
          });
          setUser(normalizedUser);
        } catch {
          clearSession();
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, refreshSession]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const login = async ({ login, password }) => {
    try {
      const payload = await loginRequest({ login, password });
      const normalizedUser = applySession(payload);

      return {
        success: true,
        user: normalizedUser,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed.',
      };
    }
  };

  const logout = async () => {
    const session_id = Number(getStoredSessionId() || 0);
    const accessToken = getStoredAccessToken();

    try {
      if (session_id && accessToken) {
        await logoutRequest({ session_id, accessToken });
      }
    } catch {
      // Ignore logout API failure and clear local session anyway.
    } finally {
      clearSession();
    }
  };

  const updateProfile = async () => {
    return {
      success: false,
      message: 'Profile update endpoint is not connected yet.',
    };
  };

  const changePassword = async () => {
    return {
      success: false,
      message: 'Change password endpoint is not connected yet.',
    };
  };

  const register = async () => {
    return {
      success: false,
      message: 'Direct self-registration is disabled. Accounts are created through invitation and administrator workflows.',
    };
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      register,
      updateProfile,
      changePassword,
      refreshSession,
      isLoading,
      isAuthenticated: Boolean(user),
    }),
    [user, isLoading, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;