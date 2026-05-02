import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// ─── Coordinate conversion ────────────────────────────────────────────────────
function latLngToVec3(lat, lng, radius = 1) {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Earth + dots (all in same group so dots rotate with Earth) ───────────────
function EarthGroup({ races, visibleCount, selectedId, hoveredId, onSelect, onHover }) {
  const groupRef = useRef();

  const [colorMap, normalMap] = useTexture([
    '/earth_blue.jpg',
    '/earth_normal.jpg',
  ]);

  colorMap.anisotropy = 16;
  normalMap.anisotropy = 8;

  // Slow auto-rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.025; // slow, cinematic drift
    }
  });

  const validRaces = races.filter(r => r.latitude != null && r.longitude != null);

  return (
    <group ref={groupRef}>
      {/* Earth sphere — MeshStandardMaterial for physically correct look */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={colorMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.08, 0.08)}
          roughness={0.75}
          metalness={0.0}
        />
      </mesh>

      {/* Atmosphere — single thin rim, not too thick */}
      <mesh>
        <sphereGeometry args={[1.02, 64, 64]} />
        <meshPhongMaterial
          color={new THREE.Color(0x4488ff)}
          emissive={new THREE.Color(0x1133aa)}
          emissiveIntensity={0.6}
          transparent
          opacity={0.10}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Race dots — only render up to visibleCount */}
      {validRaces.slice(0, visibleCount).map((race, i) => (
        <RaceDot
          key={race._id}
          race={race}
          index={i}
          isSelected={selectedId === race._id}
          isHovered={hoveredId === race._id}
          onClick={onSelect}
          onHover={onHover}
        />
      ))}
    </group>
  );
}

// ─── Single race dot ──────────────────────────────────────────────────────────
function RaceDot({ race, index, isSelected, isHovered, onClick, onHover }) {
  const dotRef    = useRef();
  const ringRef   = useRef();
  const scaleRef  = useRef(0); // starts at 0, pops in
  const active    = isSelected || isHovered;

  const pos = useMemo(
    () => latLngToVec3(race.latitude, race.longitude, 1.015),
    [race.latitude, race.longitude]
  );

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
    return q;
  }, [pos]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Pop-in scale animation
    scaleRef.current = Math.min(1, scaleRef.current + 0.12);
    const baseScale  = scaleRef.current;

    if (dotRef.current) {
      const target = (active ? 1.9 : 1) * baseScale;
      dotRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.18);
      dotRef.current.material.color.set(active ? '#E10600' : '#ffffff');
    }

    if (ringRef.current) {
      if (active) {
        const pulse = (1 + Math.sin(t * 4) * 0.45) * baseScale;
        ringRef.current.scale.setScalar(pulse);
        ringRef.current.material.opacity = Math.max(0, 0.75 - Math.sin(t * 4) * 0.35);
      } else {
        ringRef.current.scale.setScalar(0.01);
        ringRef.current.material.opacity = 0;
      }
    }
  });

  return (
    <group position={pos} quaternion={quaternion}>
      {/* Dot */}
      <mesh
        ref={dotRef}
        scale={[0, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(race); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(race._id); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = 'default'; }}
        renderOrder={2}
      >
        <cylinderGeometry args={[0.013, 0.013, 0.003, 16]} />
        <meshBasicMaterial color="#ffffff" depthTest={false} />
      </mesh>

      {/* Soft glow halo */}
      <mesh renderOrder={1}>
        <cylinderGeometry args={[0.024, 0.024, 0.001, 16]} />
        <meshBasicMaterial
          color={active ? '#E10600' : '#ffffff'}
          transparent
          opacity={active ? 0.4 : 0.15}
          depthTest={false}
        />
      </mesh>

      {/* Pulse ring */}
      <mesh ref={ringRef} renderOrder={3}>
        <ringGeometry args={[0.022, 0.032, 32]} />
        <meshBasicMaterial
          color="#E10600"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function GlobeScene({ races, visibleCount, selectedId, onSelect, onHoverChange }) {
  const [hoveredId, setHoveredId] = useState(null);

  const handleHover = (id) => {
    setHoveredId(id);
    onHoverChange?.(id ? races.find(r => r._id === id) : null);
  };

  return (
    <>
      {/* Even, bright lighting — like Google Earth / the reference image */}
      {/* High ambient so the whole globe is visible, no harsh dark side */}
      <ambientLight intensity={2.2} color="#ffffff" />
      {/* Directional from front-right for subtle depth */}
      <directionalLight position={[2, 1, 3]} intensity={1.2} color="#ffffff" />

      <Suspense fallback={null}>
        <EarthGroup
          races={races}
          visibleCount={visibleCount}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelect}
          onHover={handleHover}
        />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={1.35}
        maxDistance={4}
        rotateSpeed={0.45}
        zoomSpeed={0.7}
        enableDamping
        dampingFactor={0.07}
      />
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export default function F1Globe({ races, visibleCount, selectedId, onSelect, onHoverChange }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <GlobeScene
        races={races}
        visibleCount={visibleCount ?? races.length}
        selectedId={selectedId}
        onSelect={onSelect}
        onHoverChange={onHoverChange}
      />
    </Canvas>
  );
}
