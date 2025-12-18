import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar } from '../components/Calendar';
import { Header } from '../components/Header';
import { StoreSelector } from '../components/StoreSelector';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Dashboard = () => {
  const { user, token, loading: authLoading } = useAuth();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && token) {
      fetchStores();
    }
  }, [user, token]);

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStores(response.data);
      if (response.data.length > 0) {
        setSelectedStore(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-page">
      <Header />
      
      <div className="p-8 md:p-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <StoreSelector
            stores={stores}
            selectedStore={selectedStore}
            onSelectStore={setSelectedStore}
          />

          {selectedStore && (
            <Calendar
              store={selectedStore}
              currentWeekStart={currentWeekStart}
              onWeekChange={setCurrentWeekStart}
            />
          )}
        </div>
      </div>
    </div>
  );
};

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}