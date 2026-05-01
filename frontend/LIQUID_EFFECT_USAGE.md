# Liquid Distortion Effect - Quick Start Guide

## 🚀 Getting Started

### Method 1: Standalone HTML Demo (Easiest)

1. Open the demo file directly in your browser:
   ```
   frontend/public/liquid-distortion-demo.html
   ```
   
2. Move your mouse around to see the effect!

**No installation or build required!** This uses Three.js from CDN.

---

### Method 2: React Integration (In Your App)

1. **Start your development server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to the liquid hero page:**
   ```
   http://localhost:5173/liquid-hero
   ```

3. **Move your mouse to create ripples!**

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `public/liquid-distortion-demo.html` | Standalone demo (no build needed) |
| `src/pages/LiquidHero.jsx` | Full page with UI overlay |
| `src/components/LiquidDistortion.jsx` | Basic reusable component |
| `src/components/LiquidDistortionEffect.jsx` | Advanced standalone component |
| `LIQUID_DISTORTION_README.md` | Full technical documentation |

---

## 🎨 How It Works

1. **Mouse Movement** → Creates ripples at cursor position
2. **Ripples** → Drawn to a displacement canvas
3. **Displacement Map** → Fed to WebGL shader
4. **Shader** → Distorts foreground texture to reveal background
5. **Visual Effects** → Adds chromatic aberration, refraction, glow

---

## ⚙️ Customization

### Change Colors/Teams

Edit the `createTeamTexture` function in `LiquidHero.jsx`:

```javascript
// Line ~80-120
const createTeamTexture = (team) => {
  // Change gradient colors here
  gradient.addColorStop(0, '#YOUR_COLOR');
  
  // Change text here
  ctx.fillText('YOUR TEAM NAME', x, y);
};
```

### Adjust Effect Intensity

Modify the config object (around line 20):

```javascript
const config = {
  rippleIntensity: 0.1,      // 0.0 - 0.3 (distortion strength)
  rippleSpeed: 2.2,          // 1.0 - 5.0 (expansion speed)
  rippleFade: 0.96,          // 0.9 - 0.99 (decay rate)
  maxRipples: 18,            // 10 - 30 (concurrent ripples)
  chromaticAberration: 0.004 // 0.0 - 0.01 (RGB separation)
};
```

### Use Real Images Instead of Canvas

Replace texture creation with image loading:

```javascript
const textureLoader = new THREE.TextureLoader();
const foregroundTexture = textureLoader.load('/images/redbull-bg.jpg');
const backgroundTexture = textureLoader.load('/images/mclaren-bg.jpg');
```

---

## 🎯 Integration Examples

### Add to Home Page

```jsx
// In Home.jsx
import LiquidDistortionEffect from '../components/LiquidDistortionEffect';

function Home() {
  return (
    <div>
      <LiquidDistortionEffect />
      {/* Your other content */}
    </div>
  );
}
```

### Add as Hero Section

```jsx
// Create a hero section with the effect
<div className="relative h-screen">
  <LiquidDistortionEffect />
  <div className="absolute inset-0 z-10 flex items-center justify-center">
    <h1>Your Content Here</h1>
  </div>
</div>
```

---

## 🐛 Troubleshooting

### Black Screen?
- Check browser console for errors
- Verify Three.js is installed: `npm list three`
- Test with the standalone HTML demo first

### Poor Performance?
- Reduce `displacementSize` to 512
- Lower `maxRipples` to 10
- Disable chromatic aberration

### Ripples Not Showing?
- Check if mouse events are working
- Verify canvas is visible (check z-index)
- Try clicking instead of just moving

---

## 📊 Performance

**Typical Performance:**
- Desktop: 60 FPS (smooth)
- Mobile: 30-60 FPS (depends on device)
- Memory: ~50-100 MB

**Optimization Tips:**
- Lower displacement resolution for mobile
- Reduce max ripples on slower devices
- Use simpler shaders (remove effects)

---

## 🎓 Learn More

For detailed technical documentation, see:
- `LIQUID_DISTORTION_README.md` - Full technical guide
- Shader code comments - Inline explanations
- Three.js docs - https://threejs.org/docs/

---

## 🎨 Effect Presets

### Subtle (Elegant)
```javascript
rippleIntensity: 0.05
rippleSpeed: 1.5
rippleFade: 0.98
```

### Medium (Balanced) - Default
```javascript
rippleIntensity: 0.1
rippleSpeed: 2.2
rippleFade: 0.96
```

### Intense (Dramatic)
```javascript
rippleIntensity: 0.2
rippleSpeed: 3.0
rippleFade: 0.93
```

---

## 🔗 Quick Links

- **Demo Page:** `/liquid-hero`
- **Standalone HTML:** `public/liquid-distortion-demo.html`
- **Main Component:** `src/pages/LiquidHero.jsx`
- **Documentation:** `LIQUID_DISTORTION_README.md`

---

## ✨ Features Checklist

- ✅ Realistic water ripples
- ✅ Mouse velocity detection
- ✅ Chromatic aberration
- ✅ Refraction effects
- ✅ Edge glow
- ✅ Touch support
- ✅ Responsive design
- ✅ Performance optimized
- ✅ Custom cursor
- ✅ Smooth animations

---

**Enjoy creating liquid magic! 🌊**

Need help? Check the full documentation in `LIQUID_DISTORTION_README.md`
