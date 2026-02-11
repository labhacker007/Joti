'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI } from '@/api/client';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', { email, password });
      const response = await usersAPI.login(email, password) as any;
      console.log('Login response:', response);

      // Handle both response.data and direct response
      const data = response.data || response;

      if (data && data.user && data.access_token) {
        console.log('Login successful, setting auth...');
        const { user, access_token, refresh_token } = data;
        setAuth(user, access_token, refresh_token);
        console.log('Auth set, redirecting to dashboard...');
        router.push('/dashboard');
      } else {
        console.error('Invalid response structure:', data);
        setError('Login failed: Invalid response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Login failed';
      setError(String(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleLogin} className="w-full max-w-md p-6 border rounded-lg border-border">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Joti Login</h1>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded text-sm">{error}</div>}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md border-border bg-background text-foreground"
            placeholder="admin@example.com"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-foreground">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md border-border bg-background text-foreground pr-10"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </div>
  );
}
