# Liquid Distortion Effect Documentation

## Overview

An interactive WebGL-based liquid distortion effect that creates realistic water-like ripples on mouse movement. The effect reveals a background layer (McLaren F1) beneath a foreground layer (Red Bull Racing) through fluid distortion, chromatic aberration, and refraction effects.

## Features

✨ **Realistic Water Physics**
- Dynamic ripple generation based on mouse velocity
- Multiple concentric waves per ripple
- Smooth fade-out and decay
- Wave interference patterns

🎨 **Advanced Visual Effects**
- Chromatic aberration for realism
- Refraction-based distortion using normal mapping
- Edge glow at distortion boundaries
- Subtle vignette effect
- Smooth color mixing between layers

⚡ **Performance Optimized**
- Hardware-accelerated WebGL rendering
- Efficient canvas-based displacement mapping
- Automatic pixel ratio adjustment
- Ripple pooling (max 15-20 concurrent ripples)
- RequestAnimationFrame for smooth 60fps

📱 **Responsive & Accessible**
- Works on all screen sizes
- Touch support for mobile devices
- Graceful degradation
- Custom cursor feedback

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── LiquidDistortion.jsx          # Basic component version
│   │   └── LiquidDistortionEffect.jsx    # Advanced standalone version
│   └── pages/
│       └── LiquidHero.jsx                # Full page implementation
└── public/
    └── liquid-distortion-demo.html       # Standalone HTML demo
```

## Quick Start

### Option 1: Standalone HTML Demo

Open `frontend/public/liquid-distortion-demo.html` directly in a browser:

```bash
# Navigate to the file
cd frontend/public
# Open in browser (or double-click the file)
open liquid-distortion-demo.html
```

No build process required! Uses CDN for Three.js.

### Option 2: React Component

1. **Install Three.js** (if not already installed):

```bash
cd frontend
npm install three
```

2. **Add route to your app**:

```jsx
// In App.jsx or your router configuration
import LiquidHero from './pages/LiquidHero';

// Add route
<Route path="/liquid-hero" element={<LiquidHero />} />
```

3. **Navigate to the page**:

```
http://localhost:5173/liquid-hero
```

## Technical Architecture

### 1. Three.js Scene Setup

```javascript
// Orthographic camera for 2D rendering
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// WebGL renderer with optimizations
const renderer = new THREE.WebGLRenderer({
  alpha: false,              // No transparency needed
  antialias: true,           // Smooth edges
  powerPreference: 'high-performance'
});
```

### 2. Displacement System

The effect uses a **displacement map** to control distortion:

```
Mouse Movement → Ripple Creation → Canvas Drawing → Texture Update → Shader Distortion
```

**Displacement Canvas:**
- 1024x1024 resolution for detail
- Drawn with radial gradients
- Fades over time (creates decay effect)
- Updated every frame

### 3. Shader Pipeline

#### Vertex Shader
Simple pass-through that provides UV coordinates:

```glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

#### Fragment Shader
Complex multi-stage processing:

1. **Sample Displacement Map**
   ```glsl
   vec4 disp = texture2D(uDisplacement, vUv);
   float displacement = disp.r;
   ```

2. **Calculate Normal Map** (for refraction)
   ```glsl
   float dispLeft = texture2D(uDisplacement, vUv + vec2(-0.002, 0.0)).r;
   float dispRight = texture2D(uDisplacement, vUv + vec2(0.002, 0.0)).r;
   vec2 normal = vec2(dispRight - dispLeft, dispDown - dispUp);
   ```

3. **Apply Distortion**
   ```glsl
   vec2 distortion = normal * uRefractionStrength * displacement;
   vec2 distortedUv = vUv + distortion * uIntensity;
   ```

4. **Chromatic Aberration**
   ```glsl
   float r = texture2D(uForeground, distortedUv + aberration).r;
   float g = texture2D(uForeground, distortedUv).g;
   float b = texture2D(uForeground, distortedUv - aberration).b;
   ```

5. **Layer Mixing**
   ```glsl
   float revealFactor = smoothstep(0.25, 0.75, displacement);
   vec3 finalColor = mix(foregroundColor, backgroundColor, revealFactor);
   ```

### 4. Ripple Physics

Each ripple is an object with properties:

```javascript
class Ripple {
  constructor(x, y, velocity) {
    this.x = x;              // Screen position
    this.y = y;
    this.radius = 0;         // Current radius
    this.maxRadius = 250;    // Max before death
    this.strength = 1.0;     // Alpha/intensity
    this.velocity = velocity; // Expansion speed
    this.alive = true;
  }

  update(deltaTime) {
    // Expand radius
    this.radius += this.velocity * rippleSpeed * deltaTime * 60;
    
    // Fade strength
    this.strength *= rippleFade; // 0.96 = 4% fade per frame
    
    // Check if dead
    if (this.strength < 0.01 || this.radius > this.maxRadius) {
      this.alive = false;
    }
  }
}
```

**Ripple Rendering:**
- 3 concentric rings per ripple
- Radial gradient for smooth falloff
- Strength decreases with ring index
- Drawn to displacement canvas

### 5. Mouse Interaction

```javascript
const handleMouseMove = (event) => {
  // Calculate velocity
  const dx = x - mouse.prevX;
  const dy = y - mouse.prevY;
  const velocity = Math.sqrt(dx * dx + dy * dy);

  // Create ripple if moving fast enough
  if (velocity > 0.5 && ripples.length < maxRipples) {
    const rippleVelocity = Math.min(velocity * 0.04, 2.5);
    ripples.push(new Ripple(x, y, rippleVelocity));
  }
};
```

**Velocity-based ripples:**
- Faster mouse = stronger ripples
- Clamped to prevent extreme values
- Limited pool prevents performance issues

## Configuration

Adjust these parameters in the code:

```javascript
const config = {
  // Distortion strength (0.0 - 1.0)
  rippleIntensity: 0.1,
  
  // How fast ripples expand (pixels/second)
  rippleSpeed: 2.2,
  
  // Fade rate per frame (0.9 - 0.99)
  rippleFade: 0.96,
  
  // Maximum concurrent ripples
  maxRipples: 18,
  
  // RGB separation amount (0.0 - 0.01)
  chromaticAberration: 0.004,
  
  // Refraction intensity (0.0 - 1.0)
  refractionStrength: 0.18,
  
  // Displacement map resolution
  displacementSize: 1024
};
```

### Effect Presets

**Subtle (Elegant):**
```javascript
rippleIntensity: 0.05
rippleSpeed: 1.5
rippleFade: 0.98
chromaticAberration: 0.002
```

**Medium (Balanced):**
```javascript
rippleIntensity: 0.1
rippleSpeed: 2.2
rippleFade: 0.96
chromaticAberration: 0.004
```

**Intense (Dramatic):**
```javascript
rippleIntensity: 0.2
rippleSpeed: 3.0
rippleFade: 0.93
chromaticAberration: 0.008
```

## Customization

### Change Team Colors/Content

Edit the `createTeamTexture` function:

```javascript
const createTeamTexture = (team) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Your custom gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#YOUR_COLOR_1');
  gradient.addColorStop(1, '#YOUR_COLOR_2');
  
  // Your custom text/logo
  ctx.fillText('YOUR TEXT', x, y);
  
  return new THREE.CanvasTexture(canvas);
};
```

### Use Real Images

Replace canvas textures with image loading:

```javascript
const textureLoader = new THREE.TextureLoader();

const foregroundTexture = textureLoader.load('/path/to/redbull.jpg');
const backgroundTexture = textureLoader.load('/path/to/mclaren.jpg');
```

### Add More Layers

Modify the shader to support 3+ layers:

```glsl
uniform sampler2D uLayer1;
uniform sampler2D uLayer2;
uniform sampler2D uLayer3;

// Mix based on displacement thresholds
vec3 color = mix(layer1, layer2, smoothstep(0.2, 0.4, displacement));
color = mix(color, layer3, smoothstep(0.6, 0.8, displacement));
```

## Performance Optimization

### Current Optimizations

1. **Ripple Pooling**: Max 15-20 ripples prevents memory issues
2. **Canvas Fade**: Gradual fade instead of clearing (smoother)
3. **Pixel Ratio Capping**: `Math.min(devicePixelRatio, 2)`
4. **Texture Filtering**: Linear filtering for speed
5. **Delta Time**: Frame-rate independent animation

### Further Optimizations

**For Lower-End Devices:**

```javascript
// Reduce displacement resolution
displacementSize: 512  // Instead of 1024

// Fewer ripples
maxRipples: 10

// Simpler shader (remove chromatic aberration)
// Comment out the aberration code in fragment shader
```

**For High-End Devices:**

```javascript
// Higher resolution
displacementSize: 2048

// More ripples
maxRipples: 30

// Add blur effect (more expensive)
// Implement Gaussian blur in shader
```

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Mobile Safari | 14+ | ✅ Full |
| Mobile Chrome | 90+ | ✅ Full |

**Requirements:**
- WebGL 1.0 support
- ES6 JavaScript
- Canvas 2D API

## Troubleshooting

### Issue: Black screen

**Solution:**
- Check browser console for WebGL errors
- Verify Three.js is loaded: `console.log(THREE)`
- Check if WebGL is enabled: Visit `chrome://gpu`

### Issue: Poor performance

**Solution:**
- Reduce `displacementSize` to 512
- Lower `maxRipples` to 10
- Disable chromatic aberration
- Check GPU usage in browser DevTools

### Issue: Ripples not appearing

**Solution:**
- Verify mouse events are firing: `console.log` in handler
- Check ripple array: `console.log(ripples.length)`
- Ensure canvas is visible and sized correctly

### Issue: Textures not loading

**Solution:**
- Check texture creation code runs
- Verify canvas dimensions are valid
- Check for CORS issues if loading images

## Advanced Techniques

### 1. Multiple Ripple Sources

Add automatic ripples at random positions:

```javascript
setInterval(() => {
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;
  ripples.push(new Ripple(x, y, 1.0));
}, 2000); // Every 2 seconds
```

### 2. Audio Reactivity

Make ripples respond to music:

```javascript
// Setup audio analyzer
const audioContext = new AudioContext();
const analyzer = audioContext.createAnalyser();

// In animation loop
const dataArray = new Uint8Array(analyzer.frequencyBinCount);
analyzer.getByteFrequencyData(dataArray);

const bass = dataArray[0]; // Low frequency
if (bass > 200) {
  // Create ripple on beat
  ripples.push(new Ripple(centerX, centerY, 2.0));
}
```

### 3. Particle System

Add particles that follow ripples:

```javascript
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    // Add to displacement canvas
  }
}
```

## Credits & Resources

**Technologies:**
- [Three.js](https://threejs.org/) - WebGL library
- [GLSL](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language) - Shader language

**Inspiration:**
- Water ripple physics
- Refraction in nature
- Chromatic aberration in lenses

**Learning Resources:**
- [The Book of Shaders](https://thebookofshaders.com/)
- [Three.js Journey](https://threejs-journey.com/)
- [WebGL Fundamentals](https://webglfundamentals.org/)

## License

This code is part of your F1 application. Modify and use as needed.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify Three.js version compatibility
4. Test with the standalone HTML demo first

---

**Enjoy creating liquid magic! 🌊✨**
