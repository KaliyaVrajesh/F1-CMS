import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

const LiquidHero = () => {
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true
    });
    
    const setSize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    setSize();

    const simScene = new THREE.Scene();
    const displayScene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const simResolution = 512;

    const rtA = new THREE.WebGLRenderTarget(simResolution, simResolution, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });
    const rtB = rtA.clone();

    const createTexture = (team) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 2048;
      const ctx = canvas.getContext('2d');
      
      if (team === 'redbull') {
        const g = ctx.createLinearGradient(0, 0, 2048, 2048);
        g.addColorStop(0, '#0600ef');
        g.addColorStop(0.5, '#1e1b4b');
        g.addColorStop(1, '#0f0a3c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 2048, 2048);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
        ctx.font = 'bold 180px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RED BULL', 1024, 924);
        ctx.font = 'bold 120px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText('RACING', 1024, 1074);
      } else {
        const g = ctx.createLinearGradient(0, 0, 2048, 2048);
        g.addColorStop(0, '#ff8700');
        g.addColorStop(0.5, '#ea580c');
        g.addColorStop(1, '#c2410c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 2048, 2048);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.font = 'bold 180px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('McLAREN', 1024, 924);
        ctx.font = 'bold 120px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText('F1 TEAM', 1024, 1074);
      }
      
      const t = new THREE.CanvasTexture(canvas);
      t.minFilter = t.magFilter = THREE.LinearFilter;
      return t;
    };

    const fgTex = createTexture('redbull');
    const bgTex = createTexture('mclaren');

    const simVert = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const simFrag = `
      uniform sampler2D uPrevFrame;
      uniform vec2 uMouse;
      uniform vec2 uMouseVel;
      uniform vec2 uResolution;
      uniform float uDecay;
      varying vec2 vUv;

      void main() {
        vec4 prev = texture2D(uPrevFrame, vUv);
        vec2 vel = prev.xy;
        
        vec2 toMouse = vUv - uMouse;
        float dist = length(toMouse * uResolution);
        float influence = smoothstep(120.0, 0.0, dist);
        
        vel += uMouseVel * influence * 0.8;
        vel *= uDecay;
        
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
    `;

    const simMat = new THREE.ShaderMaterial({
      uniforms: {
        uPrevFrame: { value: rtA.texture },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uMouseVel: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(simResolution, simResolution) },
        uDecay: { value: 0.95 }
      },
      vertexShader: simVert,
      fragmentShader: simFrag
    });

    const simMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat);
    simScene.add(simMesh);

    const displayVert = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const displayFrag = `
      uniform sampler2D uForeground;
      uniform sampler2D uBackground;
      uniform sampler2D uVelocity;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        vec4 vel = texture2D(uVelocity, vUv);
        vec2 displacement = vel.xy * uIntensity;
        
        vec2 distortedUv = vUv + displacement;
        distortedUv = clamp(distortedUv, 0.0, 1.0);
        
        vec3 fg = texture2D(uForeground, distortedUv).rgb;
        vec3 bg = texture2D(uBackground, vUv).rgb;
        
        float dispStrength = length(displacement);
        float reveal = smoothstep(0.0, 0.15, dispStrength);
        
        vec3 color = mix(fg, bg, reveal);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const displayMat = new THREE.ShaderMaterial({
      uniforms: {
        uForeground: { value: fgTex },
        uBackground: { value: bgTex },
        uVelocity: { value: rtB.texture },
        uIntensity: { value: 0.15 }
      },
      vertexShader: displayVert,
      fragmentShader: displayFrag
    });

    const displayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMat);
    displayScene.add(displayMesh);

    const mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5 };

    const handleMouseMove = (e) => {
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = 1 - e.clientY / window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      setSize();
    };

    window.addEventListener('resize', handleResize);

    let currentRT = rtA;
    let previousRT = rtB;
    let animationId;

    const animate = () => {
      const vx = (mouse.x - mouse.px) * 2;
      const vy = (mouse.y - mouse.py) * 2;

      simMat.uniforms.uPrevFrame.value = previousRT.texture;
      simMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
      simMat.uniforms.uMouseVel.value.set(vx, vy);

      renderer.setRenderTarget(currentRT);
      renderer.render(simScene, camera);

      displayMat.uniforms.uVelocity.value = currentRT.texture;
      renderer.setRenderTarget(null);
      renderer.render(displayScene, camera);

      [currentRT, previousRT] = [previousRT, currentRT];

      mouse.px = mouse.x;
      mouse.py = mouse.y;

      animationId = requestAnimationFrame(animate);
    };

    animate();
    setIsLoaded(true);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
      simMat.dispose();
      displayMat.dispose();
      fgTex.dispose();
      bgTex.dispose();
      rtA.dispose();
      rtB.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas 
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-8 left-8 right-8 flex justify-between items-center pointer-events-auto">
          <Link 
            to="/" 
            className="text-white text-2xl font-bold hover:text-yellow-400 transition-colors"
          >
            F1 Hub
          </Link>
          
          <nav className="flex gap-6">
            <Link to="/standings/drivers" className="text-white hover:text-yellow-400 transition-colors">
              Standings
            </Link>
            <Link to="/circuits" className="text-white hover:text-yellow-400 transition-colors">
              Circuits
            </Link>
            <Link to="/legends" className="text-white hover:text-yellow-400 transition-colors">
              Legends
            </Link>
          </nav>
        </div>

        <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-auto">
          <div className="max-w-4xl px-8">
            <h1 className="text-7xl font-bold text-white mb-6 drop-shadow-2xl">
              Experience F1
            </h1>
            <p className="text-2xl text-white/90 mb-12 drop-shadow-lg">
              Move your mouse to reveal the magic beneath
            </p>
            <div className="flex gap-6 justify-center">
              <Link
                to="/dashboard"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-2xl"
              >
                Enter Dashboard
              </Link>
              <Link
                to="/standings/drivers"
                className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-2xl"
              >
                View Standings
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-8 bg-black/70 backdrop-blur-md text-white p-6 rounded-lg max-w-md pointer-events-auto">
          <h3 className="text-xl font-bold mb-3">🌊 Liquid Distortion Effect</h3>
          <p className="text-sm text-white/80 mb-2">
            Move your mouse across the screen to create water-like ripples
          </p>
          <p className="text-sm text-white/80">
            Watch as the Red Bull layer distorts to reveal McLaren beneath
          </p>
        </div>

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-xl">Loading Experience...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidHero;
