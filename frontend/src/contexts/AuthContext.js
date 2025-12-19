import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(async (authToken) => {
    if (!authToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 5000
      });
      setUser(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }

      // Set timeout for hanging requests
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('Auth check timeout');
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setLoading(false);
        }
      }, 8000);

      await fetchUser(token);
      clearTimeout(timeoutId);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [token, fetchUser]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
