import { useEffect, useRef, useState } from 'react';

export default function AerodynamicCursor() {
  const cursorDotRef = useRef(null);
  const canvasRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch device
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsTouchDevice(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize, { passive: true });

    // Trail points for wind tunnel airflow
    const trail = [];
    const mouse = { x: -100, y: -100, vx: 0, vy: 0, lastX: -100, lastY: -100 };
    const dot = { x: -100, y: -100 };

    const onMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.vx = e.clientX - mouse.lastX;
      mouse.vy = e.clientY - mouse.lastY;
      mouse.lastX = e.clientX;
      mouse.lastY = e.clientY;

      const target = e.target;
      const clickable = target?.closest('a, button, input, select, textarea, [role="button"], .cursor-pointer');
      setIsHovering(!!clickable);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    let animId;
    const render = () => {
      // Lerp dot
      dot.x += (mouse.x - dot.x) * 0.35;
      dot.y += (mouse.y - dot.y) * 0.35;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%)`;
      }

      ctx.clearRect(0, 0, width, height);

      // Add trail point when moving
      const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
      if (speed > 1.5 && mouse.x > 0 && mouse.y > 0) {
        trail.push({
          x: dot.x,
          y: dot.y,
          vx: mouse.vx * 0.15,
          vy: mouse.vy * 0.15,
          age: 0,
          maxAge: Math.min(22, 10 + speed * 0.4),
          size: Math.min(3.5, 1.2 + speed * 0.08),
        });
      }

      // Draw aerodynamic wind tunnel ribbon
      if (trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);

        for (let i = 1; i < trail.length - 1; i++) {
          const xc = (trail[i].x + trail[i + 1].x) * 0.5;
          const yc = (trail[i].y + trail[i + 1].y) * 0.5;
          ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
        }

        const gradient = ctx.createLinearGradient(
          trail[0].x,
          trail[0].y,
          trail[trail.length - 1].x,
          trail[trail.length - 1].y
        );
        gradient.addColorStop(0, 'rgba(225, 6, 0, 0)');
        gradient.addColorStop(0.6, 'rgba(255, 128, 0, 0.45)');
        gradient.addColorStop(1, 'rgba(225, 6, 0, 0.85)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.min(3, 1 + speed * 0.06);
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Update & clean trail
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.x += p.vx;
        p.y += p.vy;
        p.age += 1;
        if (p.age >= p.maxAge) {
          trail.splice(i, 1);
        }
      }

      mouse.vx *= 0.82;
      mouse.vy *= 0.82;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  if (isTouchDevice) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{ width: '100vw', height: '100vh' }}
      />
      <div
        ref={cursorDotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] transition-all duration-75"
        style={{
          width: isHovering ? '28px' : '8px',
          height: isHovering ? '28px' : '8px',
          borderRadius: '50%',
          backgroundColor: isHovering ? 'rgba(225, 6, 0, 0.25)' : '#E10600',
          border: isHovering ? '1.5px solid #E10600' : 'none',
          boxShadow: isHovering
            ? '0 0 16px rgba(225, 6, 0, 0.7)'
            : '0 0 8px rgba(225, 6, 0, 0.9)',
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1), height 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease',
        }}
      />
    </>
  );
}
