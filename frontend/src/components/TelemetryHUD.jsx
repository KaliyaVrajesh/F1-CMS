import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function TelemetryHUD({ activeCar = 'redbull' }) {
  const [telemetry, setTelemetry] = useState({
    speed: 334,
    rpm: 11800,
    gear: 8,
    drs: true,
    throttle: 94,
    brake: 0,
    gForce: { x: 0.1, y: 1.8 },
  });

  const mouseSpeed = useRef(0);
  const lastMouse = useRef({ x: 0, y: 0, time: Date.now() });

  useEffect(() => {
    const onMouseMove = (e) => {
      const now = Date.now();
      const dt = Math.max(1, now - lastMouse.current.time);
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mouseSpeed.current = Math.min(60, (dist / dt) * 15);

      lastMouse.current = { x: e.clientX, y: e.clientY, time: now };
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  // Telemetry fluctuation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const extraSpeed = Math.round(mouseSpeed.current * 0.8);
        const baseSpeed = 328 + Math.floor(Math.sin(Date.now() * 0.003) * 14) + extraSpeed;
        const speed = Math.min(362, Math.max(290, baseSpeed));
        const gear = speed > 310 ? 8 : speed > 270 ? 7 : 6;
        const rpm = Math.min(12400, Math.round(10200 + (speed / 362) * 2000 + Math.random() * 120));
        const throttle = Math.min(100, Math.max(82, Math.round(88 + Math.random() * 12)));
        const gX = ((lastMouse.current.x / window.innerWidth) * 2 - 1) * 2.4;
        const gY = 1.6 + Math.sin(Date.now() * 0.002) * 0.6;

        return {
          speed,
          rpm,
          gear,
          drs: speed > 305,
          throttle,
          brake: speed < 300 ? 18 : 0,
          gForce: { x: parseFloat(gX.toFixed(1)), y: parseFloat(gY.toFixed(1)) },
        };
      });

      mouseSpeed.current *= 0.85;
    }, 120);

    return () => clearInterval(interval);
  }, []);

  // 15 Rev lights: 5 Green, 5 Red, 5 Purple
  const totalLeds = 15;
  const activeLeds = Math.min(totalLeds, Math.floor(((telemetry.rpm - 10000) / 2400) * totalLeds));

  const isMcLaren = activeCar === 'mclaren';
  const themeColor = isMcLaren ? '#FF8000' : '#E10600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.8 }}
      className="absolute bottom-8 left-8 z-30 pointer-events-none select-none hidden md:block"
    >
      <div
        className="rounded-2xl p-4 backdrop-blur-md"
        style={{
          background: 'rgba(8, 10, 16, 0.72)',
          border: `1px solid ${themeColor}33`,
          boxShadow: `0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px ${themeColor}15`,
          width: '270px',
        }}
      >
        {/* Header telemetry badge */}
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-gray-400">
              LIVE TELEMETRY
            </span>
          </div>
          <span
            className="text-[9px] font-mono px-2 py-0.5 rounded font-black tracking-wider uppercase"
            style={{
              background: telemetry.drs ? 'rgba(0, 200, 100, 0.18)' : 'rgba(255, 255, 255, 0.06)',
              color: telemetry.drs ? '#00e676' : '#666',
              border: telemetry.drs ? '1px solid rgba(0, 200, 100, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {telemetry.drs ? 'DRS ACTIVE' : 'DRS OFF'}
          </span>
        </div>

        {/* Rev limiter LED bar */}
        <div className="flex items-center justify-between gap-1 mb-3 bg-black/40 p-1.5 rounded-lg border border-white/5">
          {Array.from({ length: totalLeds }, (_, i) => {
            const isActive = i < activeLeds;
            let ledColor = '#00e676'; // Green
            if (i >= 5 && i < 10) ledColor = '#E10600'; // Red
            if (i >= 10) ledColor = '#b388ff'; // Purple/Blue shift

            return (
              <div
                key={i}
                className="flex-1 h-2 rounded-sm transition-all duration-75"
                style={{
                  backgroundColor: isActive ? ledColor : 'rgba(255, 255, 255, 0.08)',
                  boxShadow: isActive ? `0 0 6px ${ledColor}` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Speed & Gear row */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-f1heading font-black text-white tabular-nums tracking-tight">
                {telemetry.speed}
              </span>
              <span className="text-xs font-mono text-gray-500 font-bold">KM/H</span>
            </div>
            <div className="text-[10px] font-mono text-gray-400 tabular-nums">
              {telemetry.rpm.toLocaleString()} RPM
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-xs text-gray-500 font-mono">GEAR</span>
              <span
                className="text-3xl font-f1heading font-black leading-none"
                style={{ color: themeColor }}
              >
                {telemetry.gear}
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              G-FORCE: {Math.abs(telemetry.gForce.x)}G
            </span>
          </div>
        </div>

        {/* Throttle & Brake Bars */}
        <div className="space-y-1.5 pt-2 border-t border-white/5 font-mono text-[9px]">
          <div className="flex items-center gap-2">
            <span className="w-7 text-green-400 font-bold">THR</span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-100"
                style={{ width: `${telemetry.throttle}%` }}
              />
            </div>
            <span className="w-6 text-right text-gray-400">{telemetry.throttle}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-7 text-red-500 font-bold">BRK</span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-100"
                style={{ width: `${telemetry.brake}%` }}
              />
            </div>
            <span className="w-6 text-right text-gray-400">{telemetry.brake}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
