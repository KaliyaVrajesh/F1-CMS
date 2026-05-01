import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * LiquidDistortion Component
 * Creates a WebGL-based liquid distortion effect that reveals a background layer
 * when the user moves their mouse over the foreground layer
 */
const LiquidDistortion = ({ 
  foregroundContent, 
  backgroundContent,
  intensity = 0.5,
  fadeSpeed = 0.95 
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0 });
  const ripplesRef = useRef([]);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // ============================================
    // SCENE SETUP
    // ============================================
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true
    });
    
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    
    updateSize();
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // ============================================
    // TEXTURE CREATION FROM DOM ELEMENTS
    // ============================================
    const createTextureFromElement = (element) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const rect = element.getBoundingClientRect();
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Use html2canvas-like approach (simplified)
      // In production, you'd use html2canvas library or render to texture
      const data = new Image();
      data.crossOrigin = 'anonymous';
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      
      return texture;
    };

    // Create textures from content
    const foregroundTexture = new THREE.Texture();
    const backgroundTexture = new THREE.Texture();
    
    // Load textures (simplified - in production use proper texture loading)
    const textureLoader = new THREE.TextureLoader();
    
    // For demo purposes, create colored textures
    const createColorTexture = (color) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 512, 512);
      return new THREE.CanvasTexture(canvas);
    };

    const fgTexture = createColorTexture('#0600ef'); // Red Bull blue
    const bgTexture = createColorTexture('#ff8700'); // McLaren orange

    // ============================================
    // DISPLACEMENT MAP FOR RIPPLES
    // ============================================
    const displacementCanvas = document.createElement('canvas');
    displacementCanvas.width = 512;
    displacementCanvas.height = 512;
    const displacementCtx = displacementCanvas.getContext('2d');
    const displacementTexture = new THREE.CanvasTexture(displacementCanvas);

    // ============================================
    // CUSTOM SHADERS
    // ============================================
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
      uniform float uIntensity;
      uniform vec2 uResolution;
      uniform float uTime;
      
      varying vec2 vUv;
      
      void main() {
        // Sample displacement map
        vec4 displacement = texture2D(uDisplacement, vUv);
        float displacementStrength = displacement.r;
        
        // Calculate distortion offset
        vec2 distortedUv = vUv;
        
        // Create ripple effect
        float dist = displacementStrength;
        vec2 offset = vec2(
          sin(dist * 20.0 + uTime * 2.0) * dist * uIntensity,
          cos(dist * 20.0 + uTime * 2.0) * dist * uIntensity
        );
        
        distortedUv += offset * 0.1;
        
        // Sample textures
        vec4 foregroundColor = texture2D(uForeground, distortedUv);
        vec4 backgroundColor = texture2D(uBackground, vUv);
        
        // Mix based on displacement strength
        float mixFactor = smoothstep(0.3, 0.7, displacementStrength);
        vec4 finalColor = mix(foregroundColor, backgroundColor, mixFactor);
        
        // Add slight chromatic aberration for realism
        if (displacementStrength > 0.1) {
          vec2 aberrationOffset = offset * 0.02;
          float r = texture2D(uForeground, distortedUv + aberrationOffset).r;
          float g = texture2D(uForeground, distortedUv).g;
          float b = texture2D(uForeground, distortedUv - aberrationOffset).b;
          foregroundColor = vec4(r, g, b, foregroundColor.a);
          finalColor = mix(foregroundColor, backgroundColor, mixFactor);
        }
        
        gl_FragColor = finalColor;
      }
    `;

    // ============================================
    // MATERIAL AND MESH
    // ============================================
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uForeground: { value: fgTexture },
        uBackground: { value: bgTexture },
        uDisplacement: { value: displacementTexture },
        uIntensity: { value: intensity },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTime: { value: 0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // ============================================
    // RIPPLE SYSTEM
    // ============================================
    class Ripple {
      constructor(x, y, velocity = 1) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 150;
        this.strength = 1;
        this.velocity = velocity;
        this.alive = true;
      }

      update(deltaTime) {
        this.radius += this.velocity * deltaTime * 60;
        this.strength *= fadeSpeed;
        
        if (this.strength < 0.01 || this.radius > this.maxRadius) {
          this.alive = false;
        }
      }

      draw(ctx, canvasWidth, canvasHeight) {
        if (!this.alive) return;

        const x = (this.x / window.innerWidth) * canvasWidth;
        const y = (this.y / window.innerHeight) * canvasHeight;
        const radius = (this.radius / window.innerWidth) * canvasWidth;

        // Create radial gradient for smooth ripple
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const alpha = this.strength;
        
        gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ============================================
    // MOUSE INTERACTION
    // ============================================
    const handleMouseMove = (event) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      mouseRef.current.prevX = mouseRef.current.x;
      mouseRef.current.prevY = mouseRef.current.y;
      mouseRef.current.x = x;
      mouseRef.current.y = y;

      // Calculate velocity for ripple intensity
      const dx = x - mouseRef.current.prevX;
      const dy = y - mouseRef.current.prevY;
      const velocity = Math.sqrt(dx * dx + dy * dy);

      // Create new ripple
      if (velocity > 0.5) {
        ripplesRef.current.push(new Ripple(x, y, Math.min(velocity * 0.1, 3)));
      }
    };

    const handleMouseLeave = () => {
      // Create final ripple on leave
      if (mouseRef.current.x !== 0 || mouseRef.current.y !== 0) {
        ripplesRef.current.push(new Ripple(mouseRef.current.x, mouseRef.current.y, 0.5));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // ============================================
    // ANIMATION LOOP
    // ============================================
    let lastTime = performance.now();
    
    const animate = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Clear displacement canvas with fade effect
      displacementCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      displacementCtx.fillRect(0, 0, displacementCanvas.width, displacementCanvas.height);

      // Update and draw ripples
      ripplesRef.current = ripplesRef.current.filter(ripple => {
        ripple.update(deltaTime);
        if (ripple.alive) {
          ripple.draw(displacementCtx, displacementCanvas.width, displacementCanvas.height);
          return true;
        }
        return false;
      });

      // Update displacement texture
      displacementTexture.needsUpdate = true;

      // Update time uniform
      material.uniforms.uTime.value = currentTime * 0.001;

      // Render scene
      renderer.render(scene, camera);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate(performance.now());

    // ============================================
    // RESIZE HANDLER
    // ============================================
    const handleResize = () => {
      updateSize();
      material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // ============================================
    // CLEANUP
    // ============================================
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      geometry.dispose();
      material.dispose();
      fgTexture.dispose();
      bgTexture.dispose();
      displacementTexture.dispose();
      renderer.dispose();
    };
  }, [intensity, fadeSpeed]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      <canvas 
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'all'
        }}
      />
    </div>
  );
};

export default LiquidDistortion;
