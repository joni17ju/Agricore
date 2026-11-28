import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Sparkles } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { graphicsTier, particleCount } from './capability.js';

/**
 * The shared 3D stage for every mission: a low-poly field under a soft sky —
 * swaying crop rows, a few trees and a barn, drifting pollen — with soft
 * shadows and a capped pixel ratio. Phones and weak devices get a lighter
 * setup (QUALITY below); rendering pauses while the tab is hidden, and a lost
 * WebGL context is restored without losing the player's progress.
 *
 * Everything is built from simple shapes in code: there are no model files to
 * download and nothing copyrighted.
 *
 * @param {'healthy'|'stressed'|'recovering'} mood  colours the crops
 * @param {boolean} calm  reduced motion: no swaying, no particles, and frames
 *                        render only when something changes
 */
const CROP_COLORS = {
  healthy: ['#3f8f3a', '#4ea845', '#2f7a30'],
  recovering: ['#7fa63a', '#6c9e3c', '#8db04a'],
  stressed: ['#b5a03a', '#a98a35', '#8d7a2f'],
};

/** Crop rows as two instanced meshes (stems and leaves): ~140 plants, two draw calls. */
function CropRows({ mood = 'healthy', calm, rows = 7, perRow = 20, area = [22, 12], center = [0, 0, -4] }) {
  const stems = useRef();
  const leaves = useRef();
  const count = rows * perRow;
  const layout = useMemo(() => {
    const items = [];
    for (let r = 0; r < rows; r += 1) {
      for (let i = 0; i < perRow; i += 1) {
        const x = center[0] - area[0] / 2 + (i + 0.5) * (area[0] / perRow) + (Math.sin(r * 7.1 + i * 3.3) * 0.15);
        const z = center[2] - area[1] / 2 + (r + 0.5) * (area[1] / rows);
        const scale = 0.75 + ((Math.sin(i * 12.9898 + r * 78.233) + 1) / 2) * 0.5;
        items.push({ x, z, scale, phase: (i + r * 3) * 0.37 });
      }
    }
    return items;
  }, [rows, perRow, area, center]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const palette = CROP_COLORS[mood] ?? CROP_COLORS.healthy;

  const place = (time) => {
    layout.forEach((item, index) => {
      const sway = calm ? 0 : Math.sin(time * 1.4 + item.phase) * 0.12;
      dummy.position.set(item.x, 0.45 * item.scale, item.z);
      dummy.rotation.set(sway * 0.6, 0, sway);
      dummy.scale.set(item.scale, item.scale, item.scale);
      dummy.updateMatrix();
      stems.current.setMatrixAt(index, dummy.matrix);
      dummy.position.set(item.x, 0.95 * item.scale, item.z);
      dummy.rotation.set(sway * 0.6, item.phase, sway * 1.3);
      dummy.updateMatrix();
      leaves.current.setMatrixAt(index, dummy.matrix);
    });
    stems.current.instanceMatrix.needsUpdate = true;
    leaves.current.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    place(0);
    const color = new THREE.Color();
    layout.forEach((_, index) => {
      color.set(palette[index % palette.length]);
      leaves.current.setColorAt(index, color);
    });
    leaves.current.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, palette]);

  useFrame(({ clock }) => {
    if (!calm) place(clock.elapsedTime);
  });

  return (
    <group>
      <instancedMesh ref={stems} args={[null, null, count]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.9, 5]} />
        <meshStandardMaterial color="#4f7a2c" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={leaves} args={[null, null, count]} castShadow>
        <coneGeometry args={[0.28, 0.75, 6]} />
        <meshStandardMaterial roughness={0.8} flatShading />
      </instancedMesh>
    </group>
  );
}

function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1.2, 6]} />
        <meshStandardMaterial color="#6b4b2a" roughness={1} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <icosahedronGeometry args={[0.75, 0]} />
        <meshStandardMaterial color="#2f6b3a" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

function Barn({ position }) {
  return (
    <group position={position} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.4, 1.4]} />
        <meshStandardMaterial color="#a8432f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.65, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.35, 0.8, 4]} />
        <meshStandardMaterial color="#5a2b21" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.45, 0.71]}>
        <planeGeometry args={[0.6, 0.9]} />
        <meshStandardMaterial color="#f4ead2" />
      </mesh>
    </group>
  );
}

/** Background sky: a large inside-out sphere with a vertical gradient. */
function Sky({ mood }) {
  const material = useMemo(() => {
    const top = new THREE.Color(mood === 'stressed' ? '#b9c3c0' : '#8fc4e8');
    const bottom = new THREE.Color('#f6f2e8');
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: top }, bottom: { value: bottom } },
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor = vec4(mix(bottom, top, clamp(h * 1.6 + 0.1, 0.0, 1.0)), 1.0); }',
    });
  }, [mood]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} scale={60}>
      <sphereGeometry args={[1, 24, 12]} />
    </mesh>
  );
}

/** Keeps the camera aimed at the play area as the canvas resizes. */
function CameraRig({ position, target }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const narrow = size.width < size.height;
    camera.position.set(position[0], position[1] + (narrow ? 1.5 : 0), position[2] + (narrow ? 3 : 0));
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, position, target]);
  return null;
}

/** Quality settings per device tier (see capability.js). Desktop keeps the full scene. */
const QUALITY = {
  high: { dpr: [1, 1.5], antialias: true, shadows: true, sparkles: 36, perRow: 20, contactFrames: Infinity, fps: null },
  medium: { dpr: [1, 1.5], antialias: false, shadows: false, sparkles: 14, perRow: 14, contactFrames: 1, fps: null },
  low: { dpr: [1, 1], antialias: false, shadows: false, sparkles: 0, perRow: 10, contactFrames: 0, fps: 30 },
};

/** Renders at a fixed rate (frameloop "demand"), for weak devices. */
function FrameLimiter({ fps }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

/** True while the browser tab is hidden: rendering pauses then. */
function usePageHidden() {
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return hidden;
}

const RESTORE_WAIT_MS = 3000;
const MAX_RECOVERIES = 3;
const RECOVERY_WINDOW_MS = 60000;

export default function GameStage({
  mood = 'healthy',
  calm = false,
  camera = { position: [0, 4.2, 9], fov: 45 },
  target = [0, 0.6, 0],
  showCrops = true,
  children,
  label = 'Mission scene',
}) {
  const quality = QUALITY[graphicsTier()];
  const hidden = usePageHidden();
  const glRef = useRef(null);
  const detachRef = useRef(null);
  const restoreTimer = useRef(null);
  // A new key remounts only the canvas (a fresh WebGL context); the game's own
  // state lives in the component around this stage, so no progress is lost.
  const [canvasKey, setCanvasKey] = useState(0);
  const [restoring, setRestoring] = useState(false);
  const [failed, setFailed] = useState(false);
  const recoveries = useRef(0);
  const lastLoss = useRef(0);

  const attach = (gl) => {
    detachRef.current?.();
    const canvas = gl.domElement;
    const onLost = (event) => {
      event.preventDefault(); // allows the browser to restore the context
      // Only losses close together count toward giving up: a busy phone may drop
      // the context now and then during a long game and should keep its 3D view.
      if (Date.now() - lastLoss.current > RECOVERY_WINDOW_MS) recoveries.current = 0;
      lastLoss.current = Date.now();
      setRestoring(true);
      window.clearTimeout(restoreTimer.current);
      restoreTimer.current = window.setTimeout(() => {
        // Not restored in time: start a new context, or give up after a few tries.
        recoveries.current += 1;
        detachRef.current?.();
        detachRef.current = null;
        if (recoveries.current > MAX_RECOVERIES) setFailed(true);
        else {
          setCanvasKey((key) => key + 1);
          setRestoring(false);
        }
      }, RESTORE_WAIT_MS);
    };
    const onRestored = () => {
      window.clearTimeout(restoreTimer.current);
      setRestoring(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    detachRef.current = () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  };

  // Free the GPU memory as soon as the mission is left.
  useEffect(
    () => () => {
      window.clearTimeout(restoreTimer.current);
      detachRef.current?.();
      const gl = glRef.current;
      if (!gl) return;
      gl.dispose();
      gl.forceContextLoss?.();
    },
    [],
  );

  // Out of recoveries: let the page's error boundary switch to the 2D game.
  if (failed) throw new Error('The 3D view could not be restored after the graphics context was lost.');

  const limited = Boolean(quality.fps) && !calm;
  const frameloop = hidden ? 'never' : calm || limited ? 'demand' : 'always';

  return (
    <div className="m3d-stage" role="img" aria-label={label}>
      <Canvas
        key={canvasKey}
        shadows={quality.shadows}
        dpr={quality.dpr}
        frameloop={frameloop}
        camera={{ position: camera.position, fov: camera.fov, near: 0.1, far: 200 }}
        gl={{ antialias: quality.antialias, powerPreference: quality.antialias ? 'high-performance' : 'default' }}
        onCreated={({ gl }) => {
          glRef.current = gl;
          attach(gl);
        }}
      >
        {limited && !hidden && <FrameLimiter fps={quality.fps} />}
        <CameraRig position={camera.position} target={target} />
        <Sky mood={mood} />
        <fog attach="fog" args={['#eef1e6', 18, 48]} />
        <hemisphereLight args={['#fffaf0', '#6b8f4e', 0.9]} />
        <directionalLight
          position={[6, 10, 6]}
          intensity={1.6}
          castShadow={quality.shadows}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[40, 40]} />
          <meshStandardMaterial color={mood === 'stressed' ? '#a59a6a' : '#8fae5a'} roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -4]} receiveShadow>
          <planeGeometry args={[23, 13]} />
          <meshStandardMaterial color={mood === 'stressed' ? '#8a6f45' : '#7a5a37'} roughness={1} />
        </mesh>
        {showCrops && <CropRows mood={mood} calm={calm} perRow={quality.perRow} />}
        <Tree position={[-12, 0, -9]} scale={1.3} />
        <Tree position={[-9.5, 0, -12]} />
        <Tree position={[11, 0, -10]} scale={1.2} />
        <Tree position={[13, 0, -6]} scale={0.9} />
        <Barn position={[8.5, 0, -12]} />
        {!calm && quality.sparkles > 0 && <Sparkles count={quality.sparkles} scale={[18, 4, 10]} position={[0, 2.5, -2]} size={2.2} speed={0.35} color="#fff6c8" />}
        {quality.contactFrames > 0 && <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={20} blur={2.4} far={6} frames={quality.contactFrames} />}
        {children}
      </Canvas>
      {restoring && (
        <div className="m3d-restoring" role="status">
          <span className="m3d-restoring__spinner" aria-hidden="true" />
          Restoring the game…
        </div>
      )}
    </div>
  );
}

/**
 * A short burst of particles where something good (or bad) just happened.
 * Re-keyed to replay. Purely visual.
 */
export function Burst({ position = [0, 1, 0], color = '#ffd34d', count: requested = 24, calm = false }) {
  const count = particleCount(requested);
  const group = useRef();
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return { dir: new THREE.Vector3(Math.cos(angle), 0.8 + Math.random() * 0.8, Math.sin(angle)).multiplyScalar(0.06 + Math.random() * 0.05) };
      }),
    [count],
  );
  const start = useRef(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    if (start.current === null) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    group.current.children.forEach((child, i) => {
      const d = parts[i].dir;
      child.position.set(d.x * t * 30, d.y * t * 30 - 4.9 * t * t, d.z * t * 30);
      child.material.opacity = Math.max(0, 1 - t / 1.1);
    });
    group.current.visible = t < 1.2;
  });
  if (calm) return null;
  return (
    <group ref={group} position={position}>
      {parts.map((_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.07, 0]} />
          <meshBasicMaterial color={color} transparent />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Pins a page element to a point in the scene. The label itself is ordinary
 * page markup (rendered by the game next to the canvas, with
 * data-anchor="<id>"); every frame this projects its 3D point to the screen
 * and moves the element there. Keeping labels in the page's own React tree
 * makes them reliable (no separate render roots) and lets them use the app's
 * fonts and styles.
 */
export function Anchor({ id, position = [0, 0, 0] }) {
  const ref = useRef();
  const point = useMemo(() => new THREE.Vector3(), []);
  const { camera, size, gl } = useThree();
  useFrame(() => {
    if (!ref.current) return;
    const root = gl.domElement.closest('.m3d__stage-wrap');
    const element = root?.querySelector(`[data-anchor="${id}"]`);
    if (!element) return;
    ref.current.getWorldPosition(point);
    point.project(camera);
    const x = (point.x * 0.5 + 0.5) * size.width;
    const y = (-point.y * 0.5 + 0.5) * size.height;
    element.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    element.style.visibility = point.z < 1 ? 'visible' : 'hidden';
  });
  return <group ref={ref} position={position} />;
}
