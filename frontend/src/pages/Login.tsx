import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Mail, Lock, Chrome, Monitor } from 'lucide-react';

import { authAPI } from '../api/client.ts';
import { useAuthStore } from '../store/index';
import { useTheme, ThemeName, themeOptions } from '../contexts/ThemeContext';
import {
  NeuralNetworkBackground,
  MatrixRainBackground,
  FloatingOrbsBackground,
  ConstellationBackground
} from '../components/AnimatedBackgrounds';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Spinner } from '../components/ui/spinner';
import './Login.css';

// Validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'Please enter your username'),
  password: z.string().min(1, 'Please enter your password'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ============================================
// MAIN LOGIN COMPONENT
// ============================================
function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [samlEnabled, setSamlEnabled] = useState(false);
  const [checkingSaml, setCheckingSaml] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { setTokens, setUser } = useAuthStore();
  const { theme, setTheme, themeEmoji } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check SAML on mount
  useEffect(() => {
    const checkSaml = async () => {
      try {
        const response = await authAPI.checkSaml();
        setSamlEnabled(response.data?.enabled || false);
      } catch (err) {
        setSamlEnabled(false);
      } finally {
        setCheckingSaml(false);
      }
    };
    checkSaml();
  }, []);

  // Handle OAuth callback tokens
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // OAuth login successful - store tokens and redirect
      setTokens(accessToken, refreshToken);

      // Fetch user info
      authAPI.me().then(resp => {
        setUser(resp.data);
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/news');
      }).catch(err => {
        console.error('Failed to fetch user info after OAuth login:', err);
        setError('Authentication successful but failed to load user profile. Please try again.');
      });
    }
  }, [setTokens, setUser, navigate]);

  const onSubmit = async (values: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      console.log('[LOGIN] Attempting login with username:', values.username);
      console.log('[LOGIN] API URL:', process.env.REACT_APP_API_URL || 'http://localhost:8000');

      const response = await authAPI.login({
        email: values.username,
        password: values.password,
      });

      console.log('[LOGIN] Response received:', response.status, response.data?.user?.username);

      if (response.data?.access_token) {
        console.log('[LOGIN] Got access token, setting auth...');
        setTokens(response.data.access_token, response.data.refresh_token);
        console.log('[LOGIN] Tokens set');

        setUser(response.data.user);
        console.log('[LOGIN] User set');

        const from = location.state?.from?.pathname || '/news';
        console.log('[LOGIN] Redirecting to:', from);

        // Use setTimeout to ensure state is updated before navigation
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 100);
      } else {
        console.error('[LOGIN] No access token in response:', response.data);
        setError('Login failed: No token received');
      }
    } catch (err: any) {
      console.error('[LOGIN ERROR] Full error:', err);
      console.error('[LOGIN ERROR] Status:', err.response?.status);
      console.error('[LOGIN ERROR] Data:', err.response?.data);

      // Handle different error response formats
      let errorMsg = 'Invalid credentials. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.detail) {
          errorMsg = typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail);
        } else if (err.response.data.msg) {
          errorMsg = err.response.data.msg;
        } else {
          errorMsg = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      console.error('[LOGIN] Setting error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSamlLogin = () => {
    window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/saml/login`;
  };

  const handleOAuthLogin = (provider: 'google' | 'microsoft') => {
    window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/${provider}/login`;
  };

  // Select background based on theme
  const renderBackground = () => {
    switch (theme) {
      case 'matrix':
        return <MatrixRainBackground color={'#00ff00'} />;
      case 'aurora':
        return <FloatingOrbsBackground primaryColor={'#9D4EDD'} secondaryColor={'#3A86FF'} />;
      case 'red-alert':
        return <ConstellationBackground color={'#FF6B6B'} />;
      case 'midnight':
        return <FloatingOrbsBackground primaryColor={'#FF9500'} secondaryColor={'#00D9FF'} />;
      case 'daylight':
        return <NeuralNetworkBackground color={'#2196F3'} />;
      case 'command-center':
      default:
        return <NeuralNetworkBackground color={'#00D9FF'} />;
    }
  };

  return (
    <div className="joti-login min-h-screen bg-black flex items-center justify-center p-4">
      {/* Animated Background */}
      {renderBackground()}

      {/* Theme Switcher (Top Right) */}
      <div className="fixed top-4 right-4 z-50">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeName)}
          className="bg-black/60 backdrop-blur-sm text-white border border-white/20 rounded-md px-3 py-1.5 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {Object.entries(themeOptions).map(([key, { emoji, label }]) => (
            <option key={key} value={key}>
              {emoji} {label}
            </option>
          ))}
        </select>
      </div>

      {/* Content Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Joti
          </h1>
          <p className="text-muted-foreground">News Feed Aggregator</p>
        </div>

        {/* Login Card */}
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-8 shadow-2xl">
          {/* Welcome Text */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white mb-1">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* OAuth Login Buttons */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full bg-white/5 hover:bg-white/10 border-white/20"
                onClick={() => handleOAuthLogin('google')}
              >
                <Chrome className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full bg-white/5 hover:bg-white/10 border-white/20"
                onClick={() => handleOAuthLogin('microsoft')}
              >
                <Monitor className="mr-2 h-4 w-4" />
                Sign in with Microsoft
              </Button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black px-2 text-muted-foreground">OR</span>
              </div>
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-white">
                Username or Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username or email"
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-white">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                >
                  {passwordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-destructive hover:opacity-90 transition-opacity shadow-lg shadow-primary/50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* SAML Login */}
            {samlEnabled && !checkingSaml && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full border-white/20"
                onClick={handleSamlLogin}
              >
                Sign in with SSO
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
