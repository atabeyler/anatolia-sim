import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Simplified continent outlines as polygon blocks
const LAND_BLOCKS = [
  // Europe
  { x: 820, y: 160, w: 180, h: 160 },
  // Africa
  { x: 820, y: 320, w: 200, h: 320 },
  // Asia
  { x: 980, y: 130, w: 480, h: 280 },
  // Middle East
  { x: 980, y: 280, w: 160, h: 160 },
  // South/Southeast Asia
  { x: 1100, y: 320, w: 200, h: 200 },
  // North America
  { x: 200, y: 140, w: 380, h: 280 },
  // Central America
  { x: 280, y: 380, w: 100, h: 100 },
  // South America
  { x: 280, y: 440, w: 260, h: 380 },
  // Australia
  { x: 1400, y: 420, w: 260, h: 200 },
  // Greenland
  { x: 580, y: 60,  w: 140, h: 100 },
  // Japan/East Asia islands
  { x: 1500, y: 200, w: 60, h: 120 },
  // Scandinavia
  { x: 900, y: 80,  w: 80, h: 120 },
  // UK
  { x: 780, y: 140, w: 40, h: 70 },
  // Indonesia
  { x: 1360, y: 380, w: 200, h: 80 },
];

function Globe() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.025;
  });

  const [globeTex, bumpTex] = useMemo(() => {
    const w = 2048, h = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Ocean gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#060d1f');
    grad.addColorStop(0.5, '#071428');
    grad.addColorStop(1, '#040c1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Ocean shimmer
    ctx.fillStyle = 'rgba(0,60,120,0.18)';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      ctx.fillRect(x, y, Math.random() * 60 + 20, 1);
    }

    // Land masses
    LAND_BLOCKS.forEach(b => {
      const lg = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
      lg.addColorStop(0, '#1a3d1a');
      lg.addColorStop(0.5, '#224422');
      lg.addColorStop(1, '#1a3518');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      // Coast highlight
      ctx.strokeStyle = 'rgba(40,100,40,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Desert/arid highlights
    ctx.fillStyle = 'rgba(80,60,20,0.3)';
    ctx.fillRect(820, 340, 200, 180); // Sahara
    ctx.fillRect(1020, 280, 120, 120); // Arabian

    // Ice caps
    const iceGrad = ctx.createLinearGradient(0, 0, 0, 80);
    iceGrad.addColorStop(0, 'rgba(180,210,255,0.9)');
    iceGrad.addColorStop(1, 'rgba(140,180,220,0.3)');
    ctx.fillStyle = iceGrad;
    ctx.fillRect(0, 0, w, 50);
    ctx.fillRect(0, h - 60, w, 60);

    const globeTex = new THREE.CanvasTexture(canvas);

    // Bump/specular map
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 512; bCanvas.height = 256;
    const bCtx = bCanvas.getContext('2d')!;
    bCtx.fillStyle = '#222'; bCtx.fillRect(0, 0, 512, 256);
    LAND_BLOCKS.forEach(b => {
      bCtx.fillStyle = '#888';
      bCtx.fillRect(b.x / 4, b.y / 4, b.w / 4, b.h / 4);
    });
    const bumpTex = new THREE.CanvasTexture(bCanvas);

    return [globeTex, bumpTex];
  }, []);

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 80, 80]} />
        <meshStandardMaterial
          map={globeTex}
          bumpMap={bumpTex}
          bumpScale={0.05}
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>
      {/* Atmosphere glow */}
      <mesh scale={1.015}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#1a4080" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      {/* Thin outer atmosphere */}
      <mesh scale={1.03}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#0a2060" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function GridLines() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const r = 2.005;
    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      const phi = (lat * Math.PI) / 180;
      for (let i = 0; i <= 128; i++) {
        const lon = (i / 128) * 2 * Math.PI;
        pts.push(r * Math.cos(phi) * Math.cos(lon), r * Math.sin(phi), r * Math.cos(phi) * Math.sin(lon));
      }
    }
    // Longitude lines
    for (let lon = 0; lon < 360; lon += 30) {
      const theta = (lon * Math.PI) / 180;
      for (let i = 0; i <= 64; i++) {
        const phi = ((i / 64) * 180 - 90) * (Math.PI / 180);
        pts.push(r * Math.cos(phi) * Math.cos(theta), r * Math.sin(phi), r * Math.cos(phi) * Math.sin(theta));
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#1a2a5a" transparent opacity={0.35} />
    </lineSegments>
  );
}

function PopulationDots({ individuals }: { individuals: any[] }) {
  const meshRef = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.PointsMaterial).size =
        0.055 + Math.sin(clock.elapsedTime * 1.5) * 0.008;
    }
  });

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const r = 2.025;

    for (const ind of individuals) {
      const lat = (ind.y ?? 0) * Math.PI / 180;
      const lon = (ind.x ?? 0) * Math.PI / 180;
      positions.push(
        r * Math.cos(lat) * Math.cos(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.sin(lon),
      );
      if (ind.sex === 'male') colors.push(0.35, 0.6, 1.0);
      else                    colors.push(1.0, 0.45, 0.65);
    }

    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, [individuals]);

  return (
    <points ref={meshRef} geometry={geo}>
      <pointsMaterial size={0.055} vertexColors sizeAttenuation transparent opacity={0.92} />
    </points>
  );
}

function PopulationGlow({ individuals }: { individuals: any[] }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions: number[] = [];
    const r = 2.04;
    for (const ind of individuals) {
      const lat = (ind.y ?? 0) * Math.PI / 180;
      const lon = (ind.x ?? 0) * Math.PI / 180;
      positions.push(r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon));
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [individuals]);

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.14} color="#6090ff" sizeAttenuation transparent opacity={0.18} />
    </points>
  );
}

export default function WorldGlobe({ individuals = [] }: { individuals?: any[] }) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 5.5], fov: 42 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 4, 5]} intensity={1.4} color="#fff4e0" />
      <directionalLight position={[-5, -3, -4]} intensity={0.25} color="#1a30ff" />
      <pointLight position={[0, 0, 8]} intensity={0.2} color="#4060ff" />
      <Stars radius={120} depth={60} count={4000} factor={4} saturation={0} fade speed={0.4} />
      <Globe />
      <GridLines />
      {individuals.length > 0 && (
        <>
          <PopulationGlow individuals={individuals} />
          <PopulationDots individuals={individuals} />
        </>
      )}
      <OrbitControls
        enablePan={false}
        minDistance={2.8}
        maxDistance={12}
        rotateSpeed={0.45}
        zoomSpeed={0.7}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  );
}
