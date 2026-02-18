import React, { useRef, useEffect, useState, useMemo } from 'react';

// ============================================
// ANIMATED BACKGROUND COMPONENTS
// ============================================

interface BaseBackgroundProps {
  className?: string;
}

interface ColorBackgroundProps extends BaseBackgroundProps {
  color: string;
}

interface DualColorBackgroundProps extends BaseBackgroundProps {
  primaryColor: string;
  secondaryColor: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Orb {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
}

interface ConstellationParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

// 0. Threat Graph Background (Entity-style network visualization)
// Renders an animated graph of interconnected nodes resembling a threat intelligence entity graph
interface ThreatGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'hub' | 'node' | 'leaf';
  pulsePhase: number;
  pulseSpeed: number;
}

interface ThreatGraphProps extends BaseBackgroundProps {
  color: string;
  secondaryColor: string;
  isDark?: boolean;
}

export const ThreatGraphBackground: React.FC<ThreatGraphProps> = ({ color, secondaryColor, isDark = true, className = "login-animated-bg" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const nodesRef = useRef<ThreatGraphNode[]>([]);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Create nodes with different sizes/types
    const nodeCount = Math.floor((width * height) / 18000);
    nodesRef.current = [];

    for (let i = 0; i < nodeCount; i++) {
      const rand = Math.random();
      let type: 'hub' | 'node' | 'leaf';
      let radius: number;
      if (rand < 0.08) {
        type = 'hub';
        radius = 3 + Math.random() * 2;
      } else if (rand < 0.35) {
        type = 'node';
        radius = 1.5 + Math.random() * 1.5;
      } else {
        type = 'leaf';
        radius = 0.8 + Math.random() * 0.8;
      }

      nodesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius,
        type,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      timeRef.current += 1;
      ctx.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const connectionDist = 140;
      const hubConnectionDist = 200;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Draw connections first (behind nodes)
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const maxDist = a.type === 'hub' ? hubConnectionDist : connectionDist;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const strength = 1 - dist / maxDist;
            const isHubConnection = a.type === 'hub' || b.type === 'hub';

            // Determine line opacity based on connection type
            let lineOpacity: number;
            if (isHubConnection) {
              lineOpacity = strength * 0.25;
            } else {
              lineOpacity = strength * 0.12;
            }

            // Use primary color for hub connections, secondary for others
            const lineColor = isHubConnection ? color : secondaryColor;
            const alpha = Math.floor(lineOpacity * 255).toString(16).padStart(2, '0');

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = lineColor + alpha;
            ctx.lineWidth = isHubConnection ? 0.8 : 0.4;
            ctx.stroke();

            // Data pulse effect along hub connections
            if (isHubConnection && strength > 0.5) {
              const pulsePos = (timeRef.current * 0.005 + i * 0.1) % 1;
              const px = a.x + (b.x - a.x) * pulsePos;
              const py = a.y + (b.y - a.y) * pulsePos;
              const pulseAlpha = Math.floor(strength * 0.6 * 255).toString(16).padStart(2, '0');

              ctx.beginPath();
              ctx.arc(px, py, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = color + pulseAlpha;
              ctx.fill();
            }
          }
        }

        // Mouse interaction - draw lines to nearby nodes
        if (mx !== null && my !== null) {
          const mdx = mx - a.x;
          const mdy = my - a.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 180) {
            const mStrength = 1 - mDist / 180;
            const mAlpha = Math.floor(mStrength * 0.3 * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = color + mAlpha;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Soft bounce at edges
        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;

        // Gentle mouse repulsion
        if (mx !== null && my !== null) {
          const mdx = mx - node.x;
          const mdy = my - node.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 100 && mDist > 0) {
            const force = (100 - mDist) / 100 * 0.02;
            node.vx -= (mdx / mDist) * force;
            node.vy -= (mdy / mDist) * force;
          }
          // Clamp velocity
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > 0.4) {
            node.vx *= 0.4 / speed;
            node.vy *= 0.4 / speed;
          }
        }

        // Pulsing effect
        const pulse = Math.sin(timeRef.current * node.pulseSpeed + node.pulsePhase);
        const currentRadius = node.radius + pulse * (node.type === 'hub' ? 1 : 0.3);

        if (node.type === 'hub') {
          // Hub nodes: larger with glow ring
          const glowRadius = currentRadius * 4;
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
          gradient.addColorStop(0, color + '18');
          gradient.addColorStop(0.5, color + '08');
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Outer ring
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius + 2, 0, Math.PI * 2);
          ctx.strokeStyle = color + '25';
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Core
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = color + '80';
          ctx.fill();
        } else if (node.type === 'node') {
          // Regular nodes: medium with subtle glow
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, currentRadius * 3);
          gradient.addColorStop(0, secondaryColor + '12');
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius * 3, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = secondaryColor + '50';
          ctx.fill();
        } else {
          // Leaf nodes: small dots
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = (isDark ? color : secondaryColor) + '30';
          ctx.fill();
        }
      }

      // Draw cursor highlight
      if (mx !== null && my !== null) {
        const cursorGradient = ctx.createRadialGradient(mx, my, 0, mx, my, 80);
        cursorGradient.addColorStop(0, color + '08');
        cursorGradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(mx, my, 80, 0, Math.PI * 2);
        ctx.fillStyle = cursorGradient;
        ctx.fill();
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
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [color, secondaryColor, isDark]);

  return <canvas ref={canvasRef} className={className} />;
};


// 1. Neural Network Background (Nodes and connections)
export const NeuralNetworkBackground: React.FC<ColorBackgroundProps> = ({ color, className = "login-animated-bg" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
            const opacity = Math.floor((1 - distance / 120) * 30);
            ctx.strokeStyle = color + opacity.toString(16).padStart(2, '0');
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
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className={className} />;
};

// 2. Matrix Rain Background (constrained to left half with fade)
export const MatrixRainBackground: React.FC<ColorBackgroundProps> = ({ color, className = "login-animated-bg matrix-bg" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const fontSize = 14;
    // Only use left 55% of screen for matrix rain
    const leftBound = Math.floor(width * 0.55);
    const columns = Math.floor(leftBound / fontSize);
    const drops: number[] = Array(columns).fill(0).map(() => Math.floor(Math.random() * -20));
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

    let frameCount = 0;
    const animate = () => {
      frameCount++;
      if (frameCount % 2 === 0) {
        // Dim previous frame
        ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
        ctx.fillRect(0, 0, width, height);

        ctx.font = `${fontSize}px monospace`;

        drops.forEach((drop, i) => {
          const x = i * fontSize;
          // Fade out as we approach the center of the screen
          const fadeStart = leftBound * 0.6;
          let alpha = 1;
          if (x > fadeStart) {
            alpha = Math.max(0, 1 - (x - fadeStart) / (leftBound - fadeStart));
          }

          if (alpha > 0) {
            // Bright leading char
            const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.fillStyle = color + alphaHex;
            const char = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(char, x, drop * fontSize);

            // Dimmer trail chars
            const trailAlpha = Math.floor(alpha * 100).toString(16).padStart(2, '0');
            ctx.fillStyle = color + trailAlpha;
            for (let t = 1; t < 3; t++) {
              const trailChar = chars[Math.floor(Math.random() * chars.length)];
              ctx.fillText(trailChar, x, (drop - t) * fontSize);
            }
          }

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
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className={className} />;
};

// 3. Floating Orbs Background
export const FloatingOrbsBackground: React.FC<DualColorBackgroundProps> = ({
  primaryColor,
  secondaryColor,
  className = "login-animated-bg"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const orbs: Orb[] = [];
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

        // Wrap around edges
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
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [primaryColor, secondaryColor]);

  return <canvas ref={canvasRef} className={className} />;
};

// 4. Particle Constellation Background (Interactive with mouse)
export const ConstellationBackground: React.FC<ColorBackgroundProps> = ({ color, className = "login-animated-bg" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles: ConstellationParticle[] = [];
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

    const handleMouseMove = (e: MouseEvent) => {
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
        if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            const opacity = Math.floor((1 - distance / 150) * 40);
            ctx.strokeStyle = color + opacity.toString(16).padStart(2, '0');
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
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [color]);

  return <canvas ref={canvasRef} className={className} />;
};


// ============================================
// THEMED LOGIN OVERLAY ANIMATIONS
// ============================================

// 5. Intel Pipeline Ticker (Command Center theme - top of page)
// Shows a scrolling feed of simulated intel processing steps
interface IntelPipelineProps {
  color: string;
}

interface IntelItem {
  id: number;
  stage: string;
  label: string;
  progress: number;
  speed: number;
}

export const IntelPipelineOverlay: React.FC<IntelPipelineProps> = ({ color }) => {
  const [items, setItems] = useState<IntelItem[]>([]);
  const counterRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const itemsRef = useRef<IntelItem[]>([]);

  const stages = useMemo(() => [
    'FEED INGESTION',
    'NLP ANALYSIS',
    'IOC EXTRACTION',
    'TTP MAPPING',
    'THREAT SCORING',
    'INTEL REPORT',
  ], []);

  const sources = useMemo(() => [
    'RSS://darkreading.com',
    'RSS://threatpost.com',
    'RSS://bleepingcomputer.com',
    'API://virustotal.com',
    'RSS://krebs-security',
    'FEED://mitre-attack',
    'API://shodan.io',
    'RSS://thehackernews',
    'OSINT://urlhaus',
    'API://abuseipdb',
  ], []);

  const iocTypes = useMemo(() => [
    'IPv4: 185.220.101.xx',
    'HASH: a3f2b7c...',
    'CVE-2025-xxxx',
    'DOMAIN: malware.evil',
    'URL: hxxps://phish...',
    'EMAIL: actor@dark...',
    'MITRE: T1566.001',
    'YARA: rule_APT...',
  ], []);

  useEffect(() => {
    // Spawn initial items
    const initial: IntelItem[] = [];
    for (let i = 0; i < 8; i++) {
      const stageIdx = Math.floor(Math.random() * stages.length);
      const labelPool = stageIdx <= 1 ? sources : iocTypes;
      initial.push({
        id: counterRef.current++,
        stage: stages[stageIdx],
        label: labelPool[Math.floor(Math.random() * labelPool.length)],
        progress: Math.random() * 100,
        speed: 0.03 + Math.random() * 0.05,
      });
    }
    itemsRef.current = initial;
    setItems([...initial]);

    const tick = () => {
      itemsRef.current = itemsRef.current.map(item => ({
        ...item,
        progress: item.progress + item.speed,
      })).filter(item => item.progress < 120);

      // Add new items
      if (Math.random() < 0.03 && itemsRef.current.length < 10) {
        const stageIdx = Math.floor(Math.random() * stages.length);
        const labelPool = stageIdx <= 1 ? sources : iocTypes;
        itemsRef.current.push({
          id: counterRef.current++,
          stage: stages[stageIdx],
          label: labelPool[Math.floor(Math.random() * labelPool.length)],
          progress: -10,
          speed: 0.03 + Math.random() * 0.05,
        });
      }

      setItems([...itemsRef.current]);
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [stages, sources, iocTypes]);

  return (
    <div className="fixed top-0 left-0 right-0 z-10 pointer-events-none overflow-hidden" style={{ height: '80px' }}>
      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/90 to-transparent z-20" />

      {/* Pipeline stages header */}
      <div className="absolute top-0 left-0 right-0 flex justify-between px-6 py-1.5 text-[9px] font-mono tracking-widest opacity-30" style={{ color }}>
        {stages.map(s => (
          <span key={s}>{s}</span>
        ))}
      </div>

      {/* Flowing items */}
      <div className="relative w-full h-full">
        {items.map(item => {
          const opacity = item.progress < 0 ? 0 :
            item.progress < 10 ? item.progress / 10 :
            item.progress > 100 ? Math.max(0, (120 - item.progress) / 20) : 0.6;
          return (
            <div
              key={item.id}
              className="absolute text-[10px] font-mono whitespace-nowrap transition-none"
              style={{
                left: `${item.progress}%`,
                top: `${20 + (item.id % 4) * 14}px`,
                color: color,
                opacity,
                transform: 'translateX(-50%)',
                textShadow: `0 0 6px ${color}40`,
              }}
            >
              <span className="opacity-50">[{item.stage}]</span>{' '}
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Subtle scanning line */}
      <div
        className="absolute top-0 left-0 w-full h-px opacity-20"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          animation: 'scanLineH 4s linear infinite',
        }}
      />
    </div>
  );
};


// 6. Ember Particles (Midnight theme - rising from bottom)
export const EmberParticlesOverlay: React.FC<{ color: string; secondaryColor: string }> = ({ color, secondaryColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    interface Ember {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
      life: number;
      maxLife: number;
      wobble: number;
      wobbleSpeed: number;
    }

    const embers: Ember[] = [];
    const maxEmbers = 40;

    const spawnEmber = (): Ember => ({
      x: Math.random() * width,
      y: height + 10,
      size: Math.random() * 3 + 1,
      speedY: -(0.3 + Math.random() * 0.8),
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: 0.4 + Math.random() * 0.5,
      color: Math.random() > 0.5 ? color : secondaryColor,
      life: 0,
      maxLife: 200 + Math.random() * 300,
      wobble: 0,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
    });

    // Initial spawn
    for (let i = 0; i < 20; i++) {
      const e = spawnEmber();
      e.y = height * (0.3 + Math.random() * 0.7);
      e.life = Math.random() * e.maxLife * 0.5;
      embers.push(e);
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Spawn new embers
      if (embers.length < maxEmbers && Math.random() < 0.15) {
        embers.push(spawnEmber());
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life++;
        e.wobble += e.wobbleSpeed;
        e.x += e.speedX + Math.sin(e.wobble) * 0.3;
        e.y += e.speedY;

        // Fade out near end of life and near top
        const lifeFade = e.life > e.maxLife * 0.7
          ? 1 - (e.life - e.maxLife * 0.7) / (e.maxLife * 0.3)
          : 1;
        const heightFade = e.y < height * 0.2
          ? e.y / (height * 0.2)
          : 1;
        const alpha = e.opacity * lifeFade * heightFade;

        if (e.life > e.maxLife || e.y < -10 || alpha <= 0) {
          embers.splice(i, 1);
          continue;
        }

        // Draw glow
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 4);
        gradient.addColorStop(0, e.color + Math.floor(alpha * 180).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.5, e.color + Math.floor(alpha * 60).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = e.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
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
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [color, secondaryColor]);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" />;
};


// 7. Aurora Waves (Aurora theme - top of page)
export const AuroraWavesOverlay: React.FC<{ primaryColor: string; secondaryColor: string }> = ({ primaryColor, secondaryColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.005;

      // Draw multiple aurora bands
      const bands = [
        { color: primaryColor, yOffset: 0.08, amplitude: 30, frequency: 0.003, opacity: 0.15 },
        { color: secondaryColor, yOffset: 0.12, amplitude: 25, frequency: 0.004, opacity: 0.1 },
        { color: primaryColor, yOffset: 0.16, amplitude: 20, frequency: 0.005, opacity: 0.08 },
      ];

      bands.forEach(band => {
        ctx.beginPath();
        ctx.moveTo(0, 0);

        for (let x = 0; x <= width; x += 2) {
          const y = height * band.yOffset +
            Math.sin(x * band.frequency + time * 2) * band.amplitude +
            Math.sin(x * band.frequency * 1.5 + time * 3) * band.amplitude * 0.5;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, 0);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.3);
        gradient.addColorStop(0, band.color + '00');
        gradient.addColorStop(0.3, band.color + Math.floor(band.opacity * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.7, band.color + Math.floor(band.opacity * 128).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Add shimmer points along the aurora
      for (let i = 0; i < 5; i++) {
        const x = (width * 0.1) + Math.sin(time * 1.5 + i * 1.3) * width * 0.4 + width * 0.2;
        const y = height * 0.1 + Math.sin(time * 2 + i * 0.8) * 20;
        const shimmerSize = 2 + Math.sin(time * 4 + i) * 1;

        ctx.beginPath();
        ctx.arc(x, y, shimmerSize, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor + '40';
        ctx.fill();
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
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [primaryColor, secondaryColor]);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" />;
};


// 8. Radar Sweep (Red Alert theme)
export const RadarSweepOverlay: React.FC<{ color: string }> = ({ color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let angle = 0;

    interface Blip {
      angle: number;
      distance: number;
      opacity: number;
      fadeSpeed: number;
    }

    const blips: Blip[] = [];

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      angle += 0.008;

      // Radar center is bottom-left
      const cx = width * 0.15;
      const cy = height * 0.85;
      const maxRadius = Math.max(width, height) * 0.8;

      // Draw radar rings (very subtle)
      for (let r = 1; r <= 4; r++) {
        const ringR = (maxRadius / 4) * r;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = color + '08';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw sweep line
      const sweepX = cx + Math.cos(angle) * maxRadius;
      const sweepY = cy + Math.sin(angle) * maxRadius;

      // Sweep gradient trail
      const sweepGradient = ctx.createConicGradient(angle - 0.5, cx, cy);
      sweepGradient.addColorStop(0, 'transparent');
      sweepGradient.addColorStop(0.8, color + '06');
      sweepGradient.addColorStop(1, color + '12');

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, angle - 0.5, angle);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepX, sweepY);
      ctx.strokeStyle = color + '20';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Spawn blips near sweep angle
      if (Math.random() < 0.02) {
        blips.push({
          angle: angle + (Math.random() - 0.5) * 0.2,
          distance: 0.2 + Math.random() * 0.7,
          opacity: 0.6,
          fadeSpeed: 0.003 + Math.random() * 0.005,
        });
      }

      // Draw and fade blips
      for (let i = blips.length - 1; i >= 0; i--) {
        const b = blips[i];
        b.opacity -= b.fadeSpeed;
        if (b.opacity <= 0) {
          blips.splice(i, 1);
          continue;
        }

        const bx = cx + Math.cos(b.angle) * maxRadius * b.distance;
        const by = cy + Math.sin(b.angle) * maxRadius * b.distance;

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
        grad.addColorStop(0, color + Math.floor(b.opacity * 200).toString(16).padStart(2, '0'));
        grad.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
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
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" />;
};


// 9. Sunbeam Rays (Daylight theme - subtle light rays from top-right)
export const SunbeamOverlay: React.FC<{ color: string }> = ({ color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let time = 0;

    const rayCount = 8;
    const rays = Array.from({ length: rayCount }, (_, i) => ({
      angle: (i / rayCount) * Math.PI * 0.5 - Math.PI * 0.15,
      width: 0.03 + Math.random() * 0.04,
      opacity: 0.02 + Math.random() * 0.03,
      speed: 0.0005 + Math.random() * 0.001,
      phase: Math.random() * Math.PI * 2,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      time += 1;

      // Origin: top right corner
      const ox = width * 0.9;
      const oy = -height * 0.1;
      const rayLength = Math.max(width, height) * 1.5;

      rays.forEach(ray => {
        const currentOpacity = ray.opacity * (0.6 + Math.sin(time * ray.speed * 60 + ray.phase) * 0.4);
        const currentAngle = ray.angle + Math.sin(time * ray.speed * 30) * 0.02;

        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(currentAngle);

        const gradient = ctx.createLinearGradient(0, 0, rayLength, 0);
        gradient.addColorStop(0, color + Math.floor(currentOpacity * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.5, color + Math.floor(currentOpacity * 128).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rayLength, -rayLength * ray.width);
        ctx.lineTo(rayLength, rayLength * ray.width);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
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
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" />;
};


// Export all backgrounds
export const AnimatedBackgrounds = {
  ThreatGraph: ThreatGraphBackground,
  NeuralNetwork: NeuralNetworkBackground,
  MatrixRain: MatrixRainBackground,
  FloatingOrbs: FloatingOrbsBackground,
  Constellation: ConstellationBackground,
};

export default AnimatedBackgrounds;
