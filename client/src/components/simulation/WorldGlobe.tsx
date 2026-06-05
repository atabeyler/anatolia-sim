import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

const EARTH_MAP  = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_atmos_2048.jpg';
const EARTH_BUMP = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_normal_2048.jpg';
const EARTH_SPEC = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_specular_2048.jpg';

/** Build a round soft-glow sprite texture via the Canvas 2D API. */
function makeSpriteTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  // Sharp solid circle — no glow/halo falloff
  ctx.beginPath();
  ctx.arc(half, half, half * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

function GlobeMesh() {
  const { gl } = useThree();
  const [earthTex, bumpTex, specTex] = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    const load = (url: string) => {
      const t = loader.load(url);
      t.anisotropy = maxAniso;
      return t;
    };
    return [load(EARTH_MAP), load(EARTH_BUMP), load(EARTH_SPEC)];
  }, [gl]);

  return (
    <mesh>
      <sphereGeometry args={[2, 128, 128]} />
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
      {/* Inner atmosphere glow */}
      <mesh scale={1.015}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#88aaff" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      {/* Outer atmosphere glow */}
      <mesh scale={1.045}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#2255bb" transparent opacity={0.06} side={THREE.BackSide} />
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
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#1a2a5a" transparent opacity={0.25} />
    </lineSegments>
  );
}

/** Build positions array for a subset of individuals at a given radius. */
function buildPositions(individuals: { x?: number; y?: number }[], r: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const ind of individuals) {
    const lat = ((ind.y ?? 0) * Math.PI) / 180;
    const lon = ((ind.x ?? 0) * Math.PI) / 180;
    positions.push(
      r * Math.cos(lat) * Math.sin(lon),
      r * Math.sin(lat),
      r * Math.cos(lat) * Math.cos(lon),
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions.length ? positions : [0, 0, 0], 3));
  return g;
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
  const spriteTex = useMemo(() => makeSpriteTexture(), []);

  const { founders, males, females } = useMemo(() => {
    const founders: any[] = [];
    const males: any[] = [];
    const females: any[] = [];
    for (const ind of individuals) {
      if (!ind.parent_1_id && !ind.parent_2_id) {
        founders.push(ind);
      } else if (ind.sex === 'male') {
        males.push(ind);
      } else {
        females.push(ind);
      }
    }
    return { founders, males, females };
  }, [individuals]);

  const founderGeo = useMemo(() => buildPositions(founders, 2.025), [founders]);
  const maleGeo    = useMemo(() => buildPositions(males,    2.025), [males]);
  const femaleGeo  = useMemo(() => buildPositions(females,  2.025), [females]);

  // Click handler shared across all three layers — finds nearest individual in world space.
  const handleClick = (e: import('@react-three/fiber').ThreeEvent<MouseEvent>) => {
    if (!onSelect || individuals.length === 0) return;
    const r = 2.025;
    let minDist = Infinity;
    let minIdx = -1;
    const ry = groupRef.current?.rotation.y ?? 0;
    individuals.forEach((ind, i) => {
      const lat = ((ind.y ?? 0) * Math.PI) / 180;
      const lon = ((ind.x ?? 0) * Math.PI) / 180;
      const px = r * Math.cos(lat) * Math.sin(lon);
      const py = r * Math.sin(lat);
      const pz = r * Math.cos(lat) * Math.cos(lon);
      // Rotate local point into world space (y-axis rotation only)
      const wx = px * Math.cos(ry) + pz * Math.sin(ry);
      const wz = -px * Math.sin(ry) + pz * Math.cos(ry);
      const d = Math.hypot(wx - e.point.x, py - e.point.y, wz - e.point.z);
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    // Only consume the click if an individual is actually selected
    if (minIdx >= 0 && minDist < 0.3) { e.stopPropagation(); onSelect(individuals[minIdx]); }
  };

  return (
    <>
      {/* Founders — gold */}
      <points geometry={founderGeo} onClick={handleClick}>
        <pointsMaterial
          map={spriteTex}
          size={0.12}
          color="#ffd700"
          sizeAttenuation
          transparent
          opacity={1.0}
          depthWrite={false}
          alphaTest={0.5}
        />
      </points>
      {/* Males — blue */}
      <points geometry={maleGeo} onClick={handleClick}>
        <pointsMaterial
          map={spriteTex}
          size={0.07}
          color="#70aaff"
          sizeAttenuation
          transparent
          opacity={1.0}
          depthWrite={false}
          alphaTest={0.5}
        />
      </points>
      {/* Females — pink */}
      <points geometry={femaleGeo} onClick={handleClick}>
        <pointsMaterial
          map={spriteTex}
          size={0.07}
          color="#ff9abf"
          sizeAttenuation
          transparent
          opacity={1.0}
          depthWrite={false}
          alphaTest={0.5}
        />
      </points>
    </>
  );
}

/** Fading trail dots showing past positions — updated each polling cycle (~8 s). */
function PopulationTrails({ snapshots }: { snapshots: { x: number; y: number }[][] }) {
  const spriteTex = useMemo(() => makeSpriteTexture(), []);

  // snapshots[0] = oldest, snapshots[last] = most recent past positions
  const layers = useMemo(() => snapshots.map((snapshot, idx) => {
    const age = snapshots.length - 1 - idx; // 0 = most recent past, higher = older
    return {
      geo: buildPositions(snapshot, 2.023),
      opacity: Math.max(0.04, 0.35 - age * 0.06),
      size: Math.max(0.035, 0.08 - age * 0.008),
    };
  }), [snapshots]);

  return (
    <>
      {layers.map((layer, i) => (
        <points key={i} geometry={layer.geo}>
          <pointsMaterial
            map={spriteTex}
            size={layer.size}
            color="#88aaee"
            sizeAttenuation
            transparent
            opacity={layer.opacity}
            depthWrite={false}
            alphaTest={0.01}
          />
        </points>
      ))}
    </>
  );
}

function GlobeClickCatcher({
  groupRef,
  onGlobeClick,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  onGlobeClick: (lat: number, lon: number) => void;
}) {
  return (
    <mesh
      onClick={(e) => {
        e.stopPropagation();
        if (!groupRef.current) return;
        const local = groupRef.current.worldToLocal(e.point.clone());
        const r = local.length();
        const lat = (Math.asin(local.y / r) * 180) / Math.PI;
        const lon = (Math.atan2(local.x, local.z) * 180) / Math.PI;
        onGlobeClick(Math.round(lat * 1000) / 1000, Math.round(lon * 1000) / 1000);
      }}
    >
      <sphereGeometry args={[2.01, 32, 32]} />
      <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
    </mesh>
  );
}

/** Transparent sphere that catches population-dot clicks and finds the nearest individual. */
function PopClickCatcher({
  individuals,
  groupRef,
  onSelect,
}: {
  individuals: any[];
  groupRef: React.RefObject<THREE.Group | null>;
  onSelect?: (ind: any) => void;
}) {
  if (!onSelect || individuals.length === 0) return null;

  return (
    <mesh
      onClick={(e) => {
        if (!onSelect || individuals.length === 0) return;
        const r = 2.025;
        let minDist = Infinity;
        let minIdx = -1;
        const ry = groupRef.current?.rotation.y ?? 0;
        individuals.forEach((ind, i) => {
          const lat = ((ind.y ?? 0) * Math.PI) / 180;
          const lon = ((ind.x ?? 0) * Math.PI) / 180;
          const px = r * Math.cos(lat) * Math.sin(lon);
          const py = r * Math.sin(lat);
          const pz = r * Math.cos(lat) * Math.cos(lon);
          const wx = px * Math.cos(ry) + pz * Math.sin(ry);
          const wz = -px * Math.sin(ry) + pz * Math.cos(ry);
          const d = Math.hypot(wx - e.point.x, py - e.point.y, wz - e.point.z);
          if (d < minDist) { minDist = d; minIdx = i; }
        });
        // Only consume the click if an individual is actually selected
        if (minIdx >= 0 && minDist < 0.3) { e.stopPropagation(); onSelect(individuals[minIdx]); }
      }}
    >
      <sphereGeometry args={[2.03, 32, 32]} />
      <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
    </mesh>
  );
}

const TRAIL_DEPTH = 6; // number of past snapshots to retain

function RotatingGroup({
  individuals,
  onSelect,
  onGlobeClick,
}: {
  individuals: any[];
  onSelect?: (ind: any) => void;
  onGlobeClick?: (lat: number, lon: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.025;
  });

  // Track position history: when individuals updates, push previous snapshot onto trail
  const prevIndRef = useRef<any[]>([]);
  const [trailSnapshots, setTrailSnapshots] = useState<{ x: number; y: number }[][]>([]);

  useEffect(() => {
    const prev = prevIndRef.current;
    if (prev.length > 0) {
      const snapshot = prev.map(ind => ({ x: ind.x ?? 0, y: ind.y ?? 0 }));
      setTrailSnapshots(s => [...s, snapshot].slice(-TRAIL_DEPTH));
    }
    prevIndRef.current = individuals;
  }, [individuals]);

  return (
    <group ref={groupRef}>
      <GlobeMesh />
      <GridLines />
      {onGlobeClick && <GlobeClickCatcher groupRef={groupRef} onGlobeClick={onGlobeClick} />}
      {individuals.length > 0 && (
        <>
          {trailSnapshots.length > 0 && <PopulationTrails snapshots={trailSnapshots} />}
          <PopulationDots individuals={individuals} groupRef={groupRef} onSelect={onSelect} />
          <PopClickCatcher individuals={individuals} groupRef={groupRef} onSelect={onSelect} />
        </>
      )}
    </group>
  );
}

export default function WorldGlobe({
  individuals = [],
  onSelect,
  onGlobeClick,
}: {
  individuals?: any[];
  onSelect?: (ind: any) => void;
  onGlobeClick?: (lat: number, lon: number) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 5.5], fov: 42 }}
      style={{ background: 'transparent' }}
      dpr={Math.min(window.devicePixelRatio, 3)}
      gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={2.8} />
      <directionalLight position={[5, 3, 6]} intensity={1.8} color="#fff8f0" />
      <directionalLight position={[-5, 3, -4]} intensity={1.3} color="#d0e8ff" />
      <directionalLight position={[0, -5, 4]} intensity={1.0} color="#ffffff" />
      <Sun />
      <Moon />
      <Stars radius={200} depth={80} count={6000} factor={5} saturation={0} fade speed={0.3} />
      <Globe />
      <RotatingGroup individuals={individuals} onSelect={onSelect} onGlobeClick={onGlobeClick} />
      <OrbitControls
        enablePan={false}
        minDistance={2.15}
        maxDistance={14}
        rotateSpeed={0.45}
        zoomSpeed={0.7}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  );
}
