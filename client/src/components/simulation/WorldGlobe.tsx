import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// NASA Blue Marble textures (three.js official examples repo)
const EARTH_MAP = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_atmos_2048.jpg';
const EARTH_BUMP = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_normal_2048.jpg';
const EARTH_SPEC = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_specular_2048.jpg';

function GlobeMesh() {
  const [earthTex, bumpTex, specTex] = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return [
      loader.load(EARTH_MAP),
      loader.load(EARTH_BUMP),
      loader.load(EARTH_SPEC),
    ];
  }, []);

  return (
    <mesh>
      <sphereGeometry args={[2, 80, 80]} />
      <meshPhongMaterial
        map={earthTex}
        bumpMap={bumpTex}
        bumpScale={0.18}
        specularMap={specTex}
        specular={new THREE.Color(0x226688)}
        shininess={12}
        emissive={new THREE.Color(0x1f3355)}
        emissiveIntensity={0.22}
      />
    </mesh>
  );
}

function Globe() {
  return (
    <>
      {/* Atmosphere glow — stays fixed, not rotating */}
      <mesh scale={1.018}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#4488ff" transparent opacity={0.10} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.04}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#1a4090" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function Sun() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.elapsedTime * 0.04;
      groupRef.current.position.set(Math.cos(t) * 18, 4, Math.sin(t) * 18);
    }
  });

  const coronaMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#fff4a0',
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
  }), []);

  return (
    <group ref={groupRef} position={[18, 4, 0]}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshBasicMaterial color="#ffe060" />
      </mesh>
      {/* Corona */}
      <mesh scale={1.6}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <primitive object={coronaMat} />
      </mesh>
      {/* Sun light — illuminates globe */}
      <pointLight intensity={4.5} color="#fff8e0" distance={80} decay={1.2} />
    </group>
  );
}

function Moon() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.elapsedTime * 0.28;
      groupRef.current.position.set(
        Math.cos(t) * 4.2,
        Math.sin(t * 0.4) * 0.6,
        Math.sin(t) * 4.2,
      );
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color="#b0b8c8" roughness={0.92} metalness={0.02} />
      </mesh>
      {/* Faint moonlight */}
      <pointLight intensity={0.08} color="#c8d8ff" distance={10} />
    </group>
  );
}

function GridLines() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const r = 2.005;
    for (let lat = -80; lat <= 80; lat += 20) {
      const phi = (lat * Math.PI) / 180;
      for (let i = 0; i <= 128; i++) {
        const lon = (i / 128) * 2 * Math.PI;
        pts.push(r * Math.cos(phi) * Math.sin(lon), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lon));
      }
    }
    for (let lon = 0; lon < 360; lon += 30) {
      const theta = (lon * Math.PI) / 180;
      for (let i = 0; i <= 64; i++) {
        const phi = ((i / 64) * 180 - 90) * (Math.PI / 180);
        pts.push(r * Math.cos(phi) * Math.sin(theta), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(theta));
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#1a2a5a" transparent opacity={0.25} />
    </lineSegments>
  );
}

function PopulationDots({
  individuals,
  groupRef,
  onSelect,
}: {
  individuals: any[];
  groupRef: React.RefObject<THREE.Group | null>;
  onSelect?: (ind: any) => void;
}) {
  const meshRef = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.PointsMaterial).size =
        0.12 + Math.sin(clock.elapsedTime * 1.5) * 0.02;
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
        r * Math.cos(lat) * Math.sin(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.cos(lon),
      );
      if (ind.sex === 'male') colors.push(0.35, 0.6, 1.0);
      else                    colors.push(1.0, 0.45, 0.65);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, [individuals]);

  return (
    <points
      ref={meshRef}
      geometry={geo}
      onClick={(e) => {
        e.stopPropagation();
        if (!onSelect || individuals.length === 0) return;
        const r = 2.025;
        let minDist = Infinity, minIdx = -1;
        individuals.forEach((ind, i) => {
          const lat = ((ind.y ?? 0) * Math.PI) / 180;
          const lon = ((ind.x ?? 0) * Math.PI) / 180;
          const px = r * Math.cos(lat) * Math.sin(lon);
          const py = r * Math.sin(lat);
          const pz = r * Math.cos(lat) * Math.cos(lon);
          const ry = groupRef.current?.rotation.y ?? 0;
          const wx = px * Math.cos(ry) + pz * Math.sin(ry);
          const wz = -px * Math.sin(ry) + pz * Math.cos(ry);
          const d = Math.hypot(wx - e.point.x, py - e.point.y, wz - e.point.z);
          if (d < minDist) { minDist = d; minIdx = i; }
        });
        if (minIdx >= 0 && minDist < 0.3) onSelect(individuals[minIdx]);
      }}
    >
      <pointsMaterial size={0.12} vertexColors sizeAttenuation transparent opacity={1.0} />
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
      positions.push(
        r * Math.cos(lat) * Math.sin(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.cos(lon),
      );
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [individuals]);

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.28} color="#6090ff" sizeAttenuation transparent opacity={0.18} />
    </points>
  );
}

function RotatingGroup({ individuals, onSelect }: { individuals: any[]; onSelect?: (ind: any) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.025;
  });
  return (
    <group ref={groupRef}>
      <GlobeMesh />
      <GridLines />
      {individuals.length > 0 && (
        <>
          <PopulationGlow individuals={individuals} />
          <PopulationDots individuals={individuals} groupRef={groupRef} onSelect={onSelect} />
        </>
      )}
    </group>
  );
}

export default function WorldGlobe({ individuals = [], onSelect }: { individuals?: any[]; onSelect?: (ind: any) => void }) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 5.5], fov: 42 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={2.8} />
      <directionalLight position={[5, 3, 6]} intensity={1.8} color="#fff8f0" />
      <directionalLight position={[-5, 3, -4]} intensity={1.3} color="#d0e8ff" />
      <directionalLight position={[0, -5, 4]} intensity={1.0} color="#ffffff" />
      <Sun />
      <Moon />
      <Stars radius={200} depth={80} count={6000} factor={5} saturation={0} fade speed={0.3} />
      <Globe />
      <RotatingGroup individuals={individuals} onSelect={onSelect} />
      <OrbitControls
        enablePan={false}
        minDistance={2.8}
        maxDistance={14}
        rotateSpeed={0.45}
        zoomSpeed={0.7}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  );
}
