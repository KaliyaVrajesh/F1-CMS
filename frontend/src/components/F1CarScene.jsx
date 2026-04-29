import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ─── Shared car positioning ───────────────────────────────────────────────────
// Both cars use IDENTICAL scale + position so they perfectly overlap.
// The reveal is done in CSS (clip-path circle) on the second canvas.

function fitModel(scene, envIntensity = 1.5) {
  const clone = scene.clone(true);
  clone.traverse(child => {
    if (child.isMesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => { if (m) m.envMapIntensity = envIntensity; });
    }
  });
  const box    = new THREE.Box3().setFromObject(clone);
  const size   = box.getSize(new THREE.Vector3());
  const s      = 6.5 / Math.max(size.x, size.y, size.z);
  const center = box.getCenter(new THREE.Vector3());
  return { model: clone, s, cx: center.x * s, cy: center.y * s };
}

// ─── Shared lighting ──────────────────────────────────────────────────────────
function Lights() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 8, 4]}  intensity={2.0} color="#ffffff" />
      <directionalLight position={[-4, 3, -3]} intensity={0.6} color="#4466ff" />
      <pointLight position={[0, 4, 3]}  intensity={1.2} color="#ffffff" distance={14} />
      <pointLight position={[2, 1, -2]} intensity={0.5} color="#ffffff" distance={10} />
      <pointLight position={[0, -2, 0]} intensity={0.25} color="#3355ff" distance={6} />
    </>
  );
}

// ─── Floating group — gentle float + mouse parallax tilt ─────────────────────
function FloatGroup({ children, mouse }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = Math.sin(t * 0.45) * 0.06;
    const tx = -mouse.current[1] * 0.05;
    const ty = mouse.current[0] * 0.06 + Math.PI / 2; // base = sideways
    ref.current.rotation.x += (tx - ref.current.rotation.x) * 0.04;
    ref.current.rotation.y += (ty - ref.current.rotation.y) * 0.04;
  });
  return <group ref={ref}>{children}</group>;
}

// ─── Red Bull scene (base layer) ─────────────────────────────────────────────
export function RedBullScene({ mouse }) {
  const { scene } = useGLTF('/oracle_red_bull_f1_car_rb19_2023.glb');
  const { model, s, cx, cy } = useMemo(() => fitModel(scene), [scene]);

  return (
    <>
      <Lights />
      <Environment preset="night" />
      <FloatGroup mouse={mouse}>
        <primitive object={model} scale={s} position={[-cx, -cy, 0]} />
      </FloatGroup>
    </>
  );
}

// ─── McLaren scene (reveal layer) ────────────────────────────────────────────
export function McLarenScene({ mouse }) {
  const { scene } = useGLTF('/mclaren_mcl60_f1_2023.glb');
  const { model, s, cx, cy } = useMemo(() => fitModel(scene, 1.6), [scene]);

  return (
    <>
      <Lights />
      <Environment preset="night" />
      <FloatGroup mouse={mouse}>
        <primitive object={model} scale={s} position={[-cx, -cy, 0]} />
      </FloatGroup>
    </>
  );
}

useGLTF.preload('/oracle_red_bull_f1_car_rb19_2023.glb');
useGLTF.preload('/mclaren_mcl60_f1_2023.glb');
