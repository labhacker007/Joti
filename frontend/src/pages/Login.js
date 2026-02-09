import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Form, Input, Button, Alert, Spin, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LoginOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  GoogleOutlined,
  WindowsOutlined
} from '@ant-design/icons';
import { authAPI } from '../api/client';
import { useAuthStore } from '../store/index';
import { useTheme } from '../contexts/ThemeContext';
import './Login.css';

const { Text, Title } = Typography;

// ============================================
// ANIMATED BACKGROUND COMPONENTS
// ============================================

// 1. Neural Network Background (Nodes and connections)
const NeuralNetworkBackground = ({ color }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Create particles
    const particleCount = Math.floor((width * height) / 25000);
    particlesRef.current = [];

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      particlesRef.current.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = color + '40';
        ctx.fill();

        // Draw connections
        particlesRef.current.slice(i + 1).forEach((other) => {
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = color + Math.floor((1 - distance / 120) * 30).toString(16).padStart(2, '0');
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="login-animated-bg" />;
};

// 2. Matrix Rain Background
const MatrixRainBackground = ({ color }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const drops = Array(columns).fill(1);
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

    let frameCount = 0;
    const animate = () => {
      frameCount++;
      // Slow down animation (render every 2nd frame)
      if (frameCount % 2 === 0) {
        ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = color;
        ctx.font = `${fontSize}px monospace`;

        drops.forEach((drop, i) => {
          const char = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(char, i * fontSize, drop * fontSize);

          if (drop * fontSize > height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="login-animated-bg matrix-bg" />;
};

// 3. Floating Orbs Background
const FloatingOrbsBackground = ({ primaryColor, secondaryColor }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const orbs = [];
    const orbCount = 5;

    for (let i = 0; i < orbCount; i++) {
      orbs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 150 + 100,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        color: i % 2 === 0 ? primaryColor : secondaryColor,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      orbs.forEach((orb) => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Bounce off edges
        if (orb.x < -orb.radius) orb.x = width + orb.radius;
        if (orb.x > width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = height + orb.radius;
        if (orb.y > height + orb.radius) orb.y = -orb.radius;

        // Draw orb with gradient
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0, orb.color + '20');
        gradient.addColorStop(0.5, orb.color + '10');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [primaryColor, secondaryColor]);

  return <canvas ref={canvasRef} className="login-animated-bg" />;
};

// 4. Particle Constellation Background
const ConstellationBackground = ({ color }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 60;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
      });
    }

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = color + '60';
        ctx.fill();

        // Connect to mouse
        if (mouseRef.current.x && mouseRef.current.y) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctx.strokeStyle = color + Math.floor((1 - distance / 150) * 40).toString(16).padStart(2, '0');
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="login-animated-bg" />;
};


// ============================================
// MAIN LOGIN COMPONENT
// ============================================
function Login() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [samlEnabled, setSamlEnabled] = useState(false);
  const [checkingSaml, setCheckingSaml] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setTokens, setUser } = useAuthStore();
  const { theme, themeEmoji } = useTheme();

  // Basic colors - no complex theme styling needed
  const bgColor = '#000';
  const textColor = '#fff';

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

  const handleSubmit = async (values) => {
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
    } catch (err) {
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
    <div className="joti-login" style={{ background: '#000', minHeight: '100vh' }}>
      {/* Animated Background */}
      {renderBackground()}

      {/* Theme Switcher (Top Right) */}
      <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        gap: 8,
      }}>
        <select
          value={theme}
          onChange={(e) => {
            // TODO: implement theme switching
          }}
          style={{
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <option value="command-center">Command Center</option>
          <option value="red-alert">Red Alert</option>
          <option value="aurora">Aurora</option>
          <option value="daylight">Daylight</option>
          <option value="midnight">Midnight</option>
          <option value="matrix">Matrix</option>
        </select>
      </div>

      {/* Content Container */}
      <div className="login-content">
        {/* Brand */}
        <div className="login-brand">
          <Title level={2} className="brand-title" style={{
            color: '#fff',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}>
            Joti
          </Title>
          <Text className="brand-subtitle" style={{ color: '#aaa' }}>
            News Feed Aggregator
          </Text>
        </div>

        {/* Login Card */}
        <div
          className="login-card"
          style={{
            background: 'rgba(0,0,0,0.6)',
            borderColor: '#444',
            border: '1px solid #444',
            borderRadius: 8,
            padding: 32,
          }}
        >
          {/* Welcome Text */}
          <div className="login-header">
            <Title level={4} style={{ color: '#fff', margin: 0 }}>
              Welcome back
            </Title>
            <Text style={{ color: '#999' }}>
              Sign in to your account
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              className="login-error"
              style={{
                background: '#ff6b6b22',
                borderColor: '#ff6b6b44',
                color: '#ff6b6b',
                marginBottom: 16,
              }}
            />
          )}

          {/* Login Form */}
          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            className="login-form"
            layout="vertical"
          >
            {/* OAuth Login Buttons */}
            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                size="large"
                block
                icon={<GoogleOutlined />}
                onClick={() => {
                  window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/google/login`;
                }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: '#444',
                  color: '#fff',
                  height: 44,
                }}
              >
                Sign in with Google
              </Button>
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                size="large"
                block
                icon={<WindowsOutlined />}
                onClick={() => {
                  window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/microsoft/login`;
                }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: '#444',
                  color: '#fff',
                  height: 44,
                }}
              >
                Sign in with Microsoft
              </Button>
            </Form.Item>

            {/* Divider */}
            <div style={{
              textAlign: 'center',
              margin: '24px 0',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                borderTop: `1px solid ${'#444'}`,
              }} />
              <span style={{
                position: 'relative',
                background: '#000',
                padding: '0 16px',
                color: '#666',
                fontSize: '14px',
              }}>
                OR
              </span>
            </div>

            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input
                prefix={<LoginOutlined style={{ color: '#666' }} />}
                placeholder="Username or email"
                size="large"
                style={{
                  background: 'transparent',
                  borderColor: '#444',
                  color: '#fff',
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#666' }} />}
                placeholder="Password"
                size="large"
                visibilityToggle={{
                  visible: passwordVisible,
                  onVisibleChange: setPasswordVisible,
                }}
                iconRender={(visible) =>
                  visible ? (
                    <EyeOutlined style={{ color: '#666' }} />
                  ) : (
                    <EyeInvisibleOutlined style={{ color: '#666' }} />
                  )
                }
                style={{
                  background: 'transparent',
                  borderColor: '#444',
                  color: '#fff',
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #FF9500, #FF6B6B)',
                  borderColor: 'transparent',
                  boxShadow: `0 4px 16px ${'#FF9500'}`,
                }}
              >
                Sign In
              </Button>
            </Form.Item>

            {/* SAML Login */}
            {samlEnabled && !checkingSaml && (
              <Form.Item>
                <Button
                  size="large"
                  block
                  onClick={handleSamlLogin}
                  style={{
                    borderColor: '#444',
                    color: '#aaa',
                  }}
                >
                  Sign in with SSO
                </Button>
              </Form.Item>
            )}
          </Form>

        </div>

      </div>
    </div>
  );
}

export default Login;
