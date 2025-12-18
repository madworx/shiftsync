import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      {/* Left side - Branding */}
      <div 
        className="hidden lg:flex items-center justify-center bg-cover bg-center relative"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1703978917919-200c8afbc678?crop=entropy&cs=srgb&fm=jpg&q=85)' }}
      >
        <div className="absolute inset-0 bg-primary/40"></div>
        <div className="relative z-10 text-white px-12">
          <h1 className="text-6xl font-bold mb-4" style={{ fontFamily: 'Chivo, sans-serif' }}>ShiftSync</h1>
          <p className="text-xl" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Personnel scheduling made simple</p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold" style={{ fontFamily: 'Chivo, sans-serif' }} data-testid="login-title">Sign In</h2>
            <p className="mt-2 text-muted-foreground" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Access your schedule</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6" data-testid="login-form">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 bg-transparent border-b-2 border-border focus:border-primary rounded-none px-0 py-2"
                  placeholder="you@example.com"
                  data-testid="login-email-input"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 bg-transparent border-b-2 border-border focus:border-primary rounded-none px-0 py-2"
                  placeholder="••••••••"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-full font-medium transition-transform active:scale-95"
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-muted rounded space-y-2 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <p className="font-semibold">Demo Credentials:</p>
            <p>Admin: admin@example.com / admin123</p>
            <p>User: john@example.com / user123</p>
          </div>
        </div>
      </div>
    </div>
  );
};