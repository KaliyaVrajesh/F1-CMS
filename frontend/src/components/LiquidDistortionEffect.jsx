import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Advanced Liquid Distortion Effect
 * Creates realistic water-like ripples that reveal background content
 * Uses WebGL shaders for high-performance rendering
 */
const LiquidDistortionEffect = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // ============================================
    // CONFIGURATION
    // ============================================
    const config = {
      rippleIntensity: 0.08,
      rippleSpeed: 2.5,
      rippleFade: 0.96,
      maxRipples: 15,
      chromaticAberration: 0.003,
      refractionStrength: 0.15
    };

    // ============================================
    // THREE.JS SETUP
    // ============================================
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

    // ============================================
    // DISPLACEMENT CANVAS (for ripples)
    // ============================================
    const displacementSize = 1024;
    const displacementCanvas = document.createElement('canvas');
    displacementCanvas.width = displacementSize;
    displacementCanvas.height = displacementSize;
    const displacementCtx = displacementCanvas.getContext('2d', { 
      willReadFrequently: false 
    });
    
    // Initialize with black
    displacementCtx.fillStyle = '#000000';
    displacementCtx.fillRect(0, 0, displacementSize, displacementSize);
    
    const displacementTexture = new THREE.CanvasTexture(displacementCanvas);
    displacementTexture.minFilter = THREE.LinearFilter;
    displacementTexture.magFilter = THREE.LinearFilter;

    // ============================================
    // CREATE DEMO TEXTURES
    // ============================================
    const createGradientTexture = (color1, color2, text) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      
      // Add pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          Math.random() * 200 + 50,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    };

    const foregroundTexture = createGradientTexture(
      '#0600ef', 
      '#1e3a8a', 
      'RED BULL RACING'
    );
    
    const backgroundTexture = createGradientTexture(
      '#ff8700', 
      '#fb923c', 
      'McLAREN F1 TEAM'
    );

    // ============================================
    // VERTEX SHADER
    // ============================================
    const vertexShader = `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // ============================================
    // FRAGMENT SHADER (Advanced Liquid Effect)
    // ============================================
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
      
      // Smooth noise function for organic movement
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        // Sample displacement map
        vec4 disp = texture2D(uDisplacement, vUv);
        float displacement = disp.r;
        
        // Calculate aspect ratio correction
        float aspect = uResolution.x / uResolution.y;
        vec2 centeredUv = vUv - 0.5;
        centeredUv.x *= aspect;
        
        // Create ripple waves
        float dist = length(centeredUv);
        float wave = sin(dist * 30.0 - uTime * 3.0) * 0.5 + 0.5;
        
        // Calculate distortion based on displacement
        vec2 distortion = vec2(0.0);
        
        if (displacement > 0.01) {
          // Calculate gradient for normal mapping
          float dispLeft = texture2D(uDisplacement, vUv + vec2(-0.001, 0.0)).r;
          float dispRight = texture2D(uDisplacement, vUv + vec2(0.001, 0.0)).r;
          float dispUp = texture2D(uDisplacement, vUv + vec2(0.0, -0.001)).r;
          float dispDown = texture2D(uDisplacement, vUv + vec2(0.0, 0.001)).r;
          
          vec2 normal = vec2(dispRight - dispLeft, dispDown - dispUp);
          
          // Apply refraction
          distortion = normal * uRefractionStrength * displacement;
          
          // Add wave motion
          distortion += vec2(
            sin(vUv.y * 20.0 + uTime * 2.0) * displacement * 0.01,
            cos(vUv.x * 20.0 + uTime * 2.0) * displacement * 0.01
          );
        }
        
        // Apply distortion to UV coordinates
        vec2 distortedUv = vUv + distortion * uIntensity;
        
        // Clamp to prevent texture bleeding
        distortedUv = clamp(distortedUv, 0.0, 1.0);
        
        // Sample foreground with chromatic aberration
        vec3 foregroundColor;
        if (displacement > 0.1) {
          float aberration = uChromaticAberration * displacement;
          float r = texture2D(uForeground, distortedUv + vec2(aberration, 0.0)).r;
          float g = texture2D(uForeground, distortedUv).g;
          float b = texture2D(uForeground, distortedUv - vec2(aberration, 0.0)).b;
          foregroundColor = vec3(r, g, b);
        } else {
          foregroundColor = texture2D(uForeground, distortedUv).rgb;
        }
        
        // Sample background
        vec3 backgroundColor = texture2D(uBackground, vUv).rgb;
        
        // Calculate reveal factor with smooth transition
        float revealFactor = smoothstep(0.2, 0.8, displacement);
        
        // Add edge glow effect
        float edgeGlow = 0.0;
        if (displacement > 0.3 && displacement < 0.7) {
          edgeGlow = sin((displacement - 0.3) * 3.14159 / 0.4) * 0.3;
        }
        
        // Mix colors
        vec3 finalColor = mix(foregroundColor, backgroundColor, revealFactor);
        
        // Add glow
        finalColor += vec3(edgeGlow);
        
        // Add subtle blur effect at distortion edges
        if (displacement > 0.05) {
          vec3 blurSample = vec3(0.0);
          float blurAmount = displacement * 0.002;
          
          blurSample += texture2D(uForeground, distortedUv + vec2(blurAmount, 0.0)).rgb;
          blurSample += texture2D(uForeground, distortedUv - vec2(blurAmount, 0.0)).rgb;
          blurSample += texture2D(uForeground, distortedUv + vec2(0.0, blurAmount)).rgb;
          blurSample += texture2D(uForeground, distortedUv - vec2(0.0, blurAmount)).rgb;
          
          foregroundColor = mix(foregroundColor, blurSample / 4.0, displacement * 0.3);
          finalColor = mix(foregroundColor, backgroundColor, revealFactor);
        }
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // ============================================
    // SHADER MATERIAL
    // ============================================
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

    // ============================================
    // RIPPLE CLASS
    // ============================================
    class Ripple {
      constructor(x, y, velocity = 1) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 200;
        this.strength = 1.0;
        this.velocity = velocity;
        this.alive = true;
        this.phase = Math.random() * Math.PI * 2;
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

        const x = (this.x / window.innerWidth) * displacementSize;
        const y = (this.y / window.innerHeight) * displacementSize;
        const radius = (this.radius / window.innerWidth) * displacementSize;

        // Draw multiple rings for more realistic ripple
        for (let i = 0; i < 3; i++) {
          const ringRadius = radius + i * 20;
          const ringStrength = this.strength * (1 - i * 0.3);
          
          const gradient = ctx.createRadialGradient(
            x, y, ringRadius * 0.7,
            x, y, ringRadius
          );
          
          gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
          gradient.addColorStop(0.5, `rgba(255, 255, 255, ${ringStrength * 0.8})`);
          gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ============================================
    // MOUSE TRACKING
    // ============================================
    const ripples = [];
    const mouse = { x: 0, y: 0, prevX: 0, prevY: 0, isMoving: false };
    let mouseTimeout;

    const handleMouseMove = (event) => {
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.isMoving = true;

      // Calculate velocity
      const dx = mouse.x - mouse.prevX;
      const dy = mouse.y - mouse.prevY;
      const velocity = Math.sqrt(dx * dx + dy * dy);

      // Create ripple based on velocity
      if (velocity > 1 && ripples.length < config.maxRipples) {
        const rippleVelocity = Math.min(velocity * 0.05, 2);
        ripples.push(new Ripple(mouse.x, mouse.y, rippleVelocity));
      }

      // Reset timeout
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        mouse.isMoving = false;
      }, 100);
    };

    const handleTouchMove = (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    // ============================================
    // ANIMATION LOOP
    // ============================================
    let lastTime = performance.now();
    let animationId;

    const animate = (currentTime) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Fade displacement canvas
      displacementCtx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      displacementCtx.fillRect(0, 0, displacementSize, displacementSize);

      // Update and draw ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].update(deltaTime);
        
        if (ripples[i].alive) {
          ripples[i].draw(displacementCtx);
        } else {
          ripples.splice(i, 1);
        }
      }

      // Update displacement texture
      displacementTexture.needsUpdate = true;

      // Update time uniform
      material.uniforms.uTime.value = currentTime * 0.001;

      // Render
      renderer.render(scene, camera);

      animationId = requestAnimationFrame(animate);
    };

    animate(performance.now());
    setIsLoaded(true);

    // ============================================
    // RESIZE HANDLER
    // ============================================
    const handleResize = () => {
      setSize();
      material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // ============================================
    // CLEANUP
    // ============================================
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      clearTimeout(mouseTimeout);
      
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
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10,
        cursor: 'none',
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out'
      }}
    >
      <canvas 
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
      
      {/* Custom cursor */}
      <style>{`
        body {
          cursor: none;
        }
      `}</style>
    </div>
  );
};

export default LiquidDistortionEffect;
