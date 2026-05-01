import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { LiquidEffectConfig, EFFECT_PRESETS, TEAM_COLORS } from '../utils/liquidEffectConfig';

/**
 * Configurable Liquid Hero Page
 * Demonstrates how to use the configuration system
 * Includes UI controls for real-time adjustments
 */
const LiquidHeroConfigurable = () => {
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentPreset, setCurrentPreset] = useState('medium');
  const [foregroundTeam, setForegroundTeam] = useState('redbull');
  const [backgroundTeam, setBackgroundTeam] = useState('mclaren');
  
  // Configuration state
  const [config, setConfig] = useState(() => 
    new LiquidEffectConfig('medium').build()
  );

  // Update configuration when preset changes
  const handlePresetChange = (presetName) => {
    setCurrentPreset(presetName);
    const newConfig = new LiquidEffectConfig(presetName).build();
    setConfig(newConfig);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance'
    });

    const setSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    
    setSize();

    // Displacement canvas
    const displacementCanvas = document.createElement('canvas');
    displacementCanvas.width = config.displacementSize;
    displacementCanvas.height = config.displacementSize;
    const displacementCtx = displacementCanvas.getContext('2d');
    
    displacementCtx.fillStyle = '#000000';
    displacementCtx.fillRect(0, 0, config.displacementSize, config.displacementSize);
    
    const displacementTexture = new THREE.CanvasTexture(displacementCanvas);
    displacementTexture.minFilter = THREE.LinearFilter;
    displacementTexture.magFilter = THREE.LinearFilter;

    // Create team textures using configuration
    const createTeamTexture = (teamKey) => {
      const team = TEAM_COLORS[teamKey];
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 2048;
      const ctx = canvas.getContext('2d');
      
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, team.primary);
      gradient.addColorStop(0.5, team.secondary);
      gradient.addColorStop(1, team.tertiary);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Team name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 140px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(team.name, canvas.width / 2, canvas.height / 2);
      
      // Accent color decoration
      ctx.strokeStyle = team.accent + '40';
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * (canvas.height / 8));
        ctx.lineTo(canvas.width, i * (canvas.height / 8));
        ctx.stroke();
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    };

    const foregroundTexture = createTeamTexture(foregroundTeam);
    const backgroundTexture = createTeamTexture(backgroundTeam);

    // Shaders
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D uForeground;
      uniform sampler2D uBackground;
      uniform sampler2D uDisplacement;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uChromaticAberration;
      uniform float uRefractionStrength;
      
      varying vec2 vUv;
      
      void main() {
        vec4 disp = texture2D(uDisplacement, vUv);
        float displacement = disp.r;
        
        vec2 distortion = vec2(0.0);
        
        if (displacement > 0.01) {
          float dispLeft = texture2D(uDisplacement, vUv + vec2(-0.002, 0.0)).r;
          float dispRight = texture2D(uDisplacement, vUv + vec2(0.002, 0.0)).r;
          float dispUp = texture2D(uDisplacement, vUv + vec2(0.0, -0.002)).r;
          float dispDown = texture2D(uDisplacement, vUv + vec2(0.0, 0.002)).r;
          
          vec2 normal = vec2(dispRight - dispLeft, dispDown - dispUp);
          distortion = normal * uRefractionStrength * displacement;
          
          float wave = sin(vUv.y * 30.0 + uTime * 3.0) * cos(vUv.x * 30.0 + uTime * 2.0);
          distortion += wave * displacement * 0.015;
        }
        
        vec2 distortedUv = clamp(vUv + distortion * uIntensity, 0.0, 1.0);
        
        vec3 foregroundColor;
        if (displacement > 0.15 && uChromaticAberration > 0.0) {
          float aberration = uChromaticAberration * displacement;
          float r = texture2D(uForeground, distortedUv + vec2(aberration, 0.0)).r;
          float g = texture2D(uForeground, distortedUv).g;
          float b = texture2D(uForeground, distortedUv - vec2(aberration, 0.0)).b;
          foregroundColor = vec3(r, g, b);
        } else {
          foregroundColor = texture2D(uForeground, distortedUv).rgb;
        }
        
        vec3 backgroundColor = texture2D(uBackground, vUv).rgb;
        float revealFactor = smoothstep(0.25, 0.75, displacement);
        
        float edgeGlow = 0.0;
        if (displacement > 0.3 && displacement < 0.7) {
          edgeGlow = sin((displacement - 0.3) * 3.14159 / 0.4) * 0.35;
        }
        
        vec3 finalColor = mix(foregroundColor, backgroundColor, revealFactor);
        finalColor += vec3(1.0, 1.0, 1.0) * edgeGlow;
        
        vec2 vignetteUv = vUv * 2.0 - 1.0;
        float vignette = 1.0 - dot(vignetteUv, vignetteUv) * 0.12;
        finalColor *= vignette;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uForeground: { value: foregroundTexture },
        uBackground: { value: backgroundTexture },
        uDisplacement: { value: displacementTexture },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uIntensity: { value: config.rippleIntensity },
        uChromaticAberration: { value: config.chromaticAberration },
        uRefractionStrength: { value: config.refractionStrength }
      },
      vertexShader,
      fragmentShader
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Ripple class
    class Ripple {
      constructor(x, y, velocity = 1) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 250;
        this.strength = 1.0;
        this.velocity = velocity;
        this.alive = true;
      }

      update(deltaTime) {
        this.radius += this.velocity * config.rippleSpeed * deltaTime * 60;
        this.strength *= config.rippleFade;
        
        if (this.strength < 0.01 || this.radius > this.maxRadius) {
          this.alive = false;
        }
      }

      draw(ctx) {
        if (!this.alive) return;

        const x = (this.x / window.innerWidth) * config.displacementSize;
        const y = (this.y / window.innerHeight) * config.displacementSize;
        const radius = (this.radius / window.innerWidth) * config.displacementSize;

        for (let i = 0; i < 3; i++) {
          const ringRadius = radius + i * 25;
          const ringStrength = this.strength * (1 - i * 0.25);
          
          const gradient = ctx.createRadialGradient(
            x, y, ringRadius * 0.6,
            x, y, ringRadius
          );
          
          gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
          gradient.addColorStop(0.5, `rgba(255, 255, 255, ${ringStrength})`);
          gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Mouse interaction
    const ripples = [];
    const mouse = { x: 0, y: 0 };

    const handleMouseMove = (event) => {
      const x = event.clientX;
      const y = event.clientY;

      const dx = x - mouse.x;
      const dy = y - mouse.y;
      const velocity = Math.sqrt(dx * dx + dy * dy);

      mouse.x = x;
      mouse.y = y;

      if (velocity > 0.5 && ripples.length < config.maxRipples) {
        const rippleVelocity = Math.min(velocity * 0.04, 2.5);
        ripples.push(new Ripple(x, y, rippleVelocity));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    let lastTime = performance.now();
    let animationId;

    const animate = (currentTime) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      displacementCtx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      displacementCtx.fillRect(0, 0, config.displacementSize, config.displacementSize);

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].update(deltaTime);
        
        if (ripples[i].alive) {
          ripples[i].draw(displacementCtx);
        } else {
          ripples.splice(i, 1);
        }
      }

      displacementTexture.needsUpdate = true;
      material.uniforms.uTime.value = currentTime * 0.001;
      
      // Update uniforms from config
      material.uniforms.uIntensity.value = config.rippleIntensity;
      material.uniforms.uChromaticAberration.value = config.chromaticAberration;
      material.uniforms.uRefractionStrength.value = config.refractionStrength;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate(performance.now());
    setIsLoaded(true);

    // Resize handler
    const handleResize = () => {
      setSize();
      material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      geometry.dispose();
      material.dispose();
      foregroundTexture.dispose();
      backgroundTexture.dispose();
      displacementTexture.dispose();
      renderer.dispose();
    };
  }, [config, foregroundTeam, backgroundTeam]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* WebGL Canvas */}
      <canvas 
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Header */}
        <div className="absolute top-8 left-8 right-8 flex justify-between items-center pointer-events-auto">
          <Link 
            to="/" 
            className="text-white text-2xl font-bold hover:text-yellow-400 transition-colors"
          >
            F1 Hub
          </Link>
          
          <button
            onClick={() => setShowControls(!showControls)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md transition-colors"
          >
            {showControls ? 'Hide' : 'Show'} Controls
          </button>
        </div>

        {/* Controls Panel */}
        {showControls && (
          <div className="absolute top-24 right-8 bg-black/80 backdrop-blur-md text-white p-6 rounded-lg max-w-sm pointer-events-auto max-h-[calc(100vh-200px)] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Effect Controls</h3>
            
            {/* Presets */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Preset</label>
              <select
                value={currentPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 rounded border border-white/20 text-white"
              >
                {Object.entries(EFFECT_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key} className="bg-gray-900">
                    {preset.name} - {preset.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Foreground Team</label>
              <select
                value={foregroundTeam}
                onChange={(e) => setForegroundTeam(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 rounded border border-white/20 text-white mb-3"
              >
                {Object.entries(TEAM_COLORS).map(([key, team]) => (
                  <option key={key} value={key} className="bg-gray-900">
                    {team.name}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-semibold mb-2">Background Team</label>
              <select
                value={backgroundTeam}
                onChange={(e) => setBackgroundTeam(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 rounded border border-white/20 text-white"
              >
                {Object.entries(TEAM_COLORS).map(([key, team]) => (
                  <option key={key} value={key} className="bg-gray-900">
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Config Info */}
            <div className="text-xs space-y-1 opacity-70">
              <p>Intensity: {config.rippleIntensity.toFixed(3)}</p>
              <p>Speed: {config.rippleSpeed.toFixed(1)}</p>
              <p>Fade: {config.rippleFade.toFixed(3)}</p>
              <p>Max Ripples: {config.maxRipples}</p>
              <p>Displacement: {config.displacementSize}px</p>
            </div>
          </div>
        )}

        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-auto">
          <div className="max-w-4xl px-8">
            <h1 className="text-7xl font-bold text-white mb-6 drop-shadow-2xl">
              Configurable Effect
            </h1>
            <p className="text-2xl text-white/90 mb-12 drop-shadow-lg">
              Try different presets and team combinations
            </p>
          </div>
        </div>

        {/* Loading */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-xl">Loading...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidHeroConfigurable;
