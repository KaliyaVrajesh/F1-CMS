import { useEffect, useRef } from 'react';

const SHAPES = ['spark', 'dot', 'line', 'diamond'];
const COLORS = ['#E10600', '#ffffff', '#ff6b00', '#ffcc00', '#aaaaaa'];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

class Particle {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.reset(true);
  }

  reset(initial = false) {
    this.x = randomBetween(0, this.w);
    this.y = initial ? randomBetween(0, this.h) : this.h + 10;
    this.size = randomBetween(1.5, 5);
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    this.vx = randomBetween(-0.12, 0.12);
    this.vy = randomBetween(-0.25, -0.05);
    this.alpha = randomBetween(0.3, 0.85);
    this.alphaDelta = randomBetween(-0.002, 0.002);
    this.repelVx = 0;
    this.repelVy = 0;
    this.rotation = randomBetween(0, Math.PI * 2);
    this.rotationSpeed = randomBetween(-0.02, 0.02);
  }

  update(mx, my) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const repelRadius = 150;

    if (dist < repelRadius && dist > 0) {
      // Slow, satisfying push — low force, high damping
      const force = (repelRadius - dist) / repelRadius;
      const angle = Math.atan2(dy, dx);
      this.repelVx += Math.cos(angle) * force * 1.2;
      this.repelVy += Math.sin(angle) * force * 1.2;
    }

    // Heavy damping = slow, fluid motion
    this.repelVx *= 0.92;
    this.repelVy *= 0.92;

    this.x += this.vx + this.repelVx;
    this.y += this.vy + this.repelVy;
    this.rotation += this.rotationSpeed;

    this.alpha += this.alphaDelta;
    if (this.alpha <= 0.2 || this.alpha >= 0.9) this.alphaDelta *= -1;

    // Wrap
    if (this.y < -20) { this.y = this.h + 10; this.x = randomBetween(0, this.w); }
    if (this.x < -20) this.x = this.w + 10;
    if (this.x > this.w + 20) this.x = -10;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    switch (this.shape) {
      case 'spark':
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.4, this.size * 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'dot':
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'line':
        ctx.lineWidth = this.size * 0.4;
        ctx.beginPath();
        ctx.moveTo(-this.size * 2, 0);
        ctx.lineTo(this.size * 2, 0);
        ctx.stroke();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 1.5);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size * 1.5);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        break;
    }
    ctx.restore();
  }
}

const F1ParticleCanvas = () => {
  const canvasRef = useRef(null);
  const stateRef = useRef({ particles: [], mouse: { x: -999, y: -999 }, animId: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = stateRef.current;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      state.particles = Array.from(
        { length: 200 },
        () => new Particle(canvas.width, canvas.height)
      );
    };

    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e) => {
      state.mouse.x = e.clientX;
      state.mouse.y = e.clientY;
    };
    const onMouseLeave = () => {
      state.mouse.x = -999;
      state.mouse.y = -999;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Connection lines
      for (let i = 0; i < state.particles.length; i++) {
        for (let j = i + 1; j < state.particles.length; j++) {
          const a = state.particles[i];
          const b = state.particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.save();
            ctx.globalAlpha = (1 - dist / 90) * 0.1;
            ctx.strokeStyle = '#E10600';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      state.particles.forEach((p) => {
        p.update(state.mouse.x, state.mouse.y);
        p.draw(ctx);
      });

      state.animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(state.animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.85,
      }}
    />
  );
};

export default F1ParticleCanvas;
