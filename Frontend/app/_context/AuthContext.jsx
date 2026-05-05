import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import i18n, { setI18nLocale } from '../../lib/i18n';
const API_URL = 'http://192.168.1.100:3000';
const AuthContext = createContext(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export const AuthProvider = ({
  children
}) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [locale, setLocale] = useState(i18n.locale);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromiseRef = useRef(null);
  const getUserLocale = userData => userData?.settings?.language || userData?.language;
  const applyLocale = nextLocale => {
    setLocale(setI18nLocale(nextLocale));
  };

  // Komponentes ielādes brīdī tiek nolasīti saglabātie autentifikācijas dati.
  useEffect(() => {
    loadStoredAuth();
  }, []);
  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('accessToken');
      const storedRefreshToken = await SecureStore.getItemAsync('refreshToken');
      const storedUser = await SecureStore.getItemAsync('user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      if (storedToken && parsedUser) {
        setToken(storedToken);
        setRefreshToken(storedRefreshToken);
        applyLocale(getUserLocale(parsedUser));
        setUser(parsedUser);
      }
      if (storedRefreshToken && parsedUser) {
        console.log("Found stored refresh token, attempting to refresh session...");
        setUser(parsedUser);
        await refreshAccessToken(storedRefreshToken);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      await clearStoredAuth();
    } finally {
      setIsLoading(false);
    }
  };
  const login = async (accessToken, userData, nextRefreshToken) => {
    try {
      await SecureStore.setItemAsync('accessToken', accessToken);
      if (nextRefreshToken) {
        await SecureStore.setItemAsync('refreshToken', nextRefreshToken);
      }
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      setToken(accessToken);
      setRefreshToken(nextRefreshToken || null);
      applyLocale(getUserLocale(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  };
  const clearStoredAuth = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    setToken(null);
    setRefreshToken(null);
    applyLocale('en');
    setUser(null);
  };
  const refreshAccessToken = async (tokenToRefresh = null) => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }
    refreshPromiseRef.current = (async () => {
      const latestStoredRefreshToken = await SecureStore.getItemAsync('refreshToken');
      const storedRefreshToken = tokenToRefresh || latestStoredRefreshToken || refreshToken;
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: storedRefreshToken
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || i18n.t("ui.failed_to_refresh_session"));
      }
      const nextAccessToken = data.data.accessToken;
      const nextRefreshToken = data.data.refreshToken || storedRefreshToken;
      await SecureStore.setItemAsync('accessToken', nextAccessToken);
      await SecureStore.setItemAsync('refreshToken', nextRefreshToken);
      setToken(nextAccessToken);
      setRefreshToken(nextRefreshToken);
      if (data.data.user) {
        await SecureStore.setItemAsync('user', JSON.stringify(data.data.user));
        applyLocale(getUserLocale(data.data.user));
        setUser(data.data.user);
      }
      return nextAccessToken;
    })();
    try {
      return await refreshPromiseRef.current;
    } finally {
      refreshPromiseRef.current = null;
    }
  };
  const logout = async () => {
    try {
      const storedRefreshToken = (await SecureStore.getItemAsync('refreshToken')) || refreshToken;
      if (storedRefreshToken) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            refreshToken: storedRefreshToken
          })
        });
      }
    } catch (error) {
      console.error('Error removing auth data:', error);
    } finally {
      await clearStoredAuth();
    }
  };

  // Lietotāja dati tiek atjaunināti kontekstā un drošajā glabātuvē.
  const updateUser = async userData => {
    try {
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      applyLocale(getUserLocale(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };
  const updateUserSettings = async settings => {
    const nextUser = {
      ...user,
      settings: {
        ...(user?.settings || {}),
        ...settings
      }
    };
    await updateUser(nextUser);
  };

  // Palīgfunkcija autentificētu API pieprasījumu veikšanai.
  const authFetch = async (endpoint, options = {}, hasRetried = false) => {
    const accessToken = (await SecureStore.getItemAsync('accessToken')) || token;
    if (!accessToken) {
      throw new Error('No authentication token available');
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
      }
    });
    const data = await response.json();

    // Tiek apstrādāts piekļuves tokena derīguma termiņa beigu gadījums.
    const isAuthError = response.status === 401 || response.status === 403 && ['Invalid or expired token', 'Invalid token type'].includes(data.message);
    if (isAuthError && !hasRetried) {
      try {
        const nextAccessToken = await refreshAccessToken();
        return await authFetch(endpoint, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${nextAccessToken}`
          }
        }, true);
      } catch (refreshError) {
        await logout();
        throw new Error('Session expired. Please login again.');
      }
    }
    return {
      response,
      data
    };
  };
  const value = {
    user,
    token,
    refreshToken,
    locale,
    isLoading,
    isAuthenticated: !!token,
    login,
    logout,
    updateUser,
    updateUserSettings,
    authFetch,
    API_URL
  };
  return <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>;
};
export default AuthContext;
