import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-border bg-background" data-testid="dashboard-header">
      <div className="px-8 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>ShiftSync</h1>
          {user?.role === 'admin' && (
            <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded-full">
              ADMIN
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            <User className="w-4 h-4" strokeWidth={1.5} />
            <span data-testid="user-name">{user?.name}</span>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="gap-2"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};