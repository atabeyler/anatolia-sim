import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

function Globe() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => { if (meshRef.current) meshRef.current.rotation.y += delta * 0.03; });
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#0a1628'); grad.addColorStop(1, '#061020');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 2048, 1024);
    ctx.fillStyle = '#1a3020';
    ctx.fillRect(400,200,300,400); ctx.fillRect(900,200,400,350); ctx.fillRect(1300,150,450,400); ctx.fillRect(1600,500,200,200);
    return new THREE.CanvasTexture(canvas);
  }, []);
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} />
      <mesh scale={1.02}><sphereGeometry args={[2, 32, 32]} /><meshStandardMaterial color="#1a3080" transparent opacity={0.08} side={THREE.BackSide} /></mesh>
    </mesh>
  );
}

function PopulationDots({ individuals }: { individuals: any[] }) {
  const points = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [], colors: number[] = [];
    for (const ind of individuals) {
      const lat = ind.y * Math.PI / 180, lon = ind.x * Math.PI / 180, r = 2.01;
      positions.push(r*Math.cos(lat)*Math.cos(lon), r*Math.sin(lat), r*Math.cos(lat)*Math.sin(lon));
      ind.sex === 'male' ? colors.push(0.3,0.5,1) : colors.push(1,0.4,0.6);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [individuals]);
  return <points geometry={points}><pointsMaterial size={0.025} vertexColors sizeAttenuation /></points>;
}

export default function WorldGlobe({ individuals = [] }: { individuals?: any[] }) {
  return (
    <Canvas camera={{ position: [0,0,5], fov: 45 }} style={{ background: 'transparent' }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5,3,5]} intensity={1.2} color="#fff8e0" />
      <directionalLight position={[-5,-3,-5]} intensity={0.2} color="#1030ff" />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade />
      <Globe />
      <PopulationDots individuals={individuals} />
      <OrbitControls enablePan={false} minDistance={2.5} maxDistance={10} rotateSpeed={0.5} zoomSpeed={0.8} dampingFactor={0.08} enableDamping />
    </Canvas>
  );
}
