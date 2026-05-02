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
  updateProfileRequest,
  changePasswordRequest,
} from '../api/client';

export const AuthContext = createContext(null);

function normalizeBackendUser(user) {
  if (!user) return null;

  return {
    id: user.id ?? user.user_id ?? user.userId,
    fullName: user.fullName || user.full_name || '',
    email: user.email || '',
    username: user.username || user.user_name || user.email || '',
    phone: user.phone || user.phone_number || '',
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

const updateProfile = async (profileData) => {
  if (!user?.id) {
    return {
      success: false,
      message: 'No authenticated user found.',
    };
  }

  try {
    const payload = {
      full_name: String(profileData.fullName || '').trim(),
      email: String(profileData.email || '').trim().toLowerCase(),
      username: String(profileData.username || profileData.email || '').trim(),
      phone: String(profileData.phone || '').trim(),
      role: user.role,
      status: user.status,
    };

    const response = await updateProfileRequest(user.id, payload);

    const updatedUser = {
      ...user,
      fullName: response?.full_name || payload.full_name,
      email: response?.email || payload.email,
      username: response?.username || payload.username,
      phone: response?.phone || payload.phone,
      role: response?.role || user.role,
      status: response?.status || user.status,
    };

    persistAuthSession({
      access_token: getStoredAccessToken(),
      refresh_token: getStoredRefreshToken(),
      session_id: getStoredSessionId(),
      user: updatedUser,
    });

    setUser(updatedUser);

    return {
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to update profile.',
    };
  }
};

const changePassword = async ({ currentPassword, newPassword }) => {
  if (!user) {
    return {
      success: false,
      message: 'No authenticated user found.',
    };
  }

  try {
    const response = await changePasswordRequest({
      currentPassword,
      newPassword,
    });

    return {
      success: true,
      message:
        response?.message ||
        response?.data?.message ||
        'Password updated successfully.',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to update password.',
    };
  }
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