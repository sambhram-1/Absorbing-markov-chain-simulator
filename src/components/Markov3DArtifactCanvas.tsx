import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface Markov3DArtifactCanvasProps {
  matrix: number[][];
  selectedNodeIndex: number;
  activeSimNode: number;
  onSelectNode: (idx: number) => void;
}

export type CameraPresetKey = 'overview' | 'transient' | 'stress' | 'absorbing';

const NODE_POSITIONS_3D = [
  new THREE.Vector3(-4.5, 0.35, -1.35), // S1: High GPA
  new THREE.Vector3(-1.5, 0.35, -1.85), // S2: Mid GPA
  new THREE.Vector3(1.5, 0.35, -1.85),  // S3: Low GPA
  new THREE.Vector3(4.5, 0.35, -1.35),  // S4: Financial Stress
  new THREE.Vector3(-2.3, 0.35, 2.25),  // A1: Graduate
  new THREE.Vector3(2.3, 0.35, 2.25),   // A2: Dropout
];

const NODE_META_3D = [
  { code: 'S1', label: 'High GPA', hex: 0x0ea5e9, accentHex: 0xbae6fd, isAbsorbing: false },
  { code: 'S2', label: 'Mid GPA', hex: 0x3b82f6, accentHex: 0xbfdbfe, isAbsorbing: false },
  { code: 'S3', label: 'Low GPA', hex: 0x6366f1, accentHex: 0xc7d2fe, isAbsorbing: false },
  { code: 'S4', label: 'Fin. Stress', hex: 0xf59e0b, accentHex: 0xfde68a, isAbsorbing: false },
  { code: 'A1', label: 'Graduate', hex: 0x10b981, accentHex: 0xa7f3d0, isAbsorbing: true },
  { code: 'A2', label: 'Dropout', hex: 0xf43f5e, accentHex: 0xfecdd3, isAbsorbing: true },
];

const CAMERA_PRESETS: Record<CameraPresetKey, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  overview: {
    pos: new THREE.Vector3(0, 6.2, 8.8),
    target: new THREE.Vector3(0, 0.4, 0.2),
  },
  transient: {
    pos: new THREE.Vector3(0, 4.4, 5.2),
    target: new THREE.Vector3(0, 0.7, -1.6),
  },
  stress: {
    pos: new THREE.Vector3(5.6, 3.8, 3.8),
    target: new THREE.Vector3(3.1, 0.6, -0.3),
  },
  absorbing: {
    pos: new THREE.Vector3(0, 4.2, 7.2),
    target: new THREE.Vector3(0, 0.5, 2.1),
  },
};

function createRadialGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle light architectural grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
  ctx.lineWidth = 1;
  const step = 32;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Concentric technical rings
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.22)';
  ctx.lineWidth = 1.5;
  [96, 176, 240].forEach((r) => {
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createNodeBadgeTexture(
  code: string,
  label: string,
  hexColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.strokeStyle = hexColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 112, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 36px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(code, 128, 56);

  ctx.fillStyle = '#475569';
  ctx.font = '500 22px "Inter", sans-serif';
  ctx.fillText(label, 128, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export const Markov3DArtifactCanvas: React.FC<Markov3DArtifactCanvasProps> = ({
  matrix,
  selectedNodeIndex,
  activeSimNode,
  onSelectNode,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetKey>('overview');
  const [explodedFactor, setExplodedFactor] = useState<number>(0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  const matrixRef = useRef(matrix);
  matrixRef.current = matrix;
  const selectedIdxRef = useRef(selectedNodeIndex);
  selectedIdxRef.current = selectedNodeIndex;
  const activeSimRef = useRef(activeSimNode);
  activeSimRef.current = activeSimNode;
  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;
  const explodedTargetRef = useRef(explodedFactor);
  explodedTargetRef.current = explodedFactor;

  const triggerCameraPresetRef = useRef<((preset: CameraPresetKey) => void) | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 310;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.036);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.copy(CAMERA_PRESETS.overview.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Daylight Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1.15);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.9);
    keyLight.position.set(6, 11, 7);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -8;
      keyLight.shadow.camera.right = 8;
      keyLight.shadow.camera.top = 6;
      keyLight.shadow.camera.bottom = -6;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-7, 6, -6);
    scene.add(rimLight);

    // Ground Floor Plane
    const gridTex = createRadialGridTexture(maxAniso);
    const floorGeo = new THREE.PlaneGeometry(18, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gridTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // 6 Multi-Part Composite 3D Pedestals in Pearl / Daylight Frosted Glass
    const interactableCoreMeshes: THREE.Object3D[] = [];
    const nodeGroups: {
      group: THREE.Group;
      coreMesh: THREE.Mesh;
      glassShell: THREE.Mesh;
      gyroRing1: THREE.Mesh;
      gyroRing2: THREE.Mesh;
      selectionHalo: THREE.Mesh;
      badgeSprite: THREE.Sprite;
    }[] = [];

    const baseGeo = new THREE.CylinderGeometry(0.76, 0.88, 0.22, 32);
    const stepGeo = new THREE.CylinderGeometry(0.58, 0.68, 0.16, 32);
    const collarGeo = new THREE.TorusGeometry(0.62, 0.045, 16, 48);
    const transCoreGeo = new THREE.OctahedronGeometry(0.38, 1);
    const absCoreGeo = new THREE.DodecahedronGeometry(0.44, 0);
    const shellGeo = new THREE.SphereGeometry(0.64, 32, 24);
    const gyroGeo1 = new THREE.TorusGeometry(0.76, 0.024, 12, 48);
    const gyroGeo2 = new THREE.TorusGeometry(0.84, 0.018, 12, 48);
    const haloGeo = new THREE.RingGeometry(0.88, 1.04, 48);
    const contactShadowGeo = new THREE.CircleGeometry(1.05, 32);

    const pearlMetalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.35,
    });

    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });

    NODE_META_3D.forEach((meta, idx) => {
      const pos = NODE_POSITIONS_3D[idx];
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      const shadowDisc = new THREE.Mesh(contactShadowGeo, contactShadowMat);
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.015;
      group.add(shadowDisc);

      // Part 1: Pearl pedestal base
      const baseMesh = new THREE.Mesh(baseGeo, pearlMetalMat);
      baseMesh.position.y = 0.11;
      baseMesh.castShadow = !isSoftwareGl;
      baseMesh.receiveShadow = !isSoftwareGl;
      group.add(baseMesh);

      // Part 2: Pastel bevel step
      const stepMat = new THREE.MeshStandardMaterial({
        color: meta.accentHex,
        roughness: 0.4,
        metalness: 0.2,
      });
      const stepMesh = new THREE.Mesh(stepGeo, stepMat);
      stepMesh.position.y = 0.28;
      group.add(stepMesh);

      // Part 3: Luminous accent trim collar
      const collarMat = new THREE.MeshStandardMaterial({
        color: meta.hex,
        emissive: meta.hex,
        emissiveIntensity: 0.25,
        roughness: 0.22,
        metalness: 0.5,
      });
      const collarMesh = new THREE.Mesh(collarGeo, collarMat);
      collarMesh.rotation.x = Math.PI / 2;
      collarMesh.position.y = 0.36;
      group.add(collarMesh);

      // Part 4: Faceted inner nucleus core
      const coreMat = new THREE.MeshStandardMaterial({
        color: meta.hex,
        emissive: meta.hex,
        emissiveIntensity: 0.35,
        roughness: 0.18,
        metalness: 0.4,
      });
      const coreMesh = new THREE.Mesh(
        meta.isAbsorbing ? absCoreGeo : transCoreGeo,
        coreMat
      );
      coreMesh.position.y = 1.05;
      coreMesh.userData = { nodeIndex: idx };
      group.add(coreMesh);
      interactableCoreMeshes.push(coreMesh);

      // Part 5: Outer Liquid Glass Vessel
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: meta.accentHex,
        roughness: 0.06,
        metalness: 0.02,
        transmission: isSoftwareGl ? 0 : 0.9,
        transparent: true,
        opacity: isSoftwareGl ? 0.38 : 1.0,
        ior: 1.48,
        thickness: 1.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        depthWrite: false,
      });
      const glassShell = new THREE.Mesh(shellGeo, glassMat);
      glassShell.position.y = 1.05;
      glassShell.renderOrder = 4;
      glassShell.userData = { nodeIndex: idx };
      group.add(glassShell);
      interactableCoreMeshes.push(glassShell);

      // Part 6 & 7: Dual Orbital Gyro Rings
      const gyroRing1 = new THREE.Mesh(gyroGeo1, collarMat);
      gyroRing1.position.y = 1.05;
      gyroRing1.rotation.x = Math.PI / 3;
      group.add(gyroRing1);

      const gyroRing2 = new THREE.Mesh(gyroGeo2, stepMat);
      gyroRing2.position.y = 1.05;
      gyroRing2.rotation.y = Math.PI / 4;
      group.add(gyroRing2);

      // Selection Floor Halo Ring
      const haloMat = new THREE.MeshBasicMaterial({
        color: meta.hex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const selectionHalo = new THREE.Mesh(haloGeo, haloMat);
      selectionHalo.rotation.x = -Math.PI / 2;
      selectionHalo.position.y = 0.025;
      group.add(selectionHalo);

      // Crisp Light Floating Badge Sprite
      const hexStr = '#' + meta.hex.toString(16).padStart(6, '0');
      const badgeTex = createNodeBadgeTexture(
        meta.code,
        meta.label,
        hexStr,
        maxAniso
      );
      const badgeMat = new THREE.SpriteMaterial({
        map: badgeTex,
        transparent: true,
        depthTest: false,
      });
      const badgeSprite = new THREE.Sprite(badgeMat);
      badgeSprite.position.set(0, 2.15, 0);
      badgeSprite.scale.set(1.5, 0.75, 1);
      badgeSprite.renderOrder = 10;
      group.add(badgeSprite);

      scene.add(group);
      nodeGroups.push({
        group,
        coreMesh,
        glassShell,
        gyroRing1,
        gyroRing2,
        selectionHalo,
        badgeSprite,
      });
    });

    // Dynamic Probability Conduit Tubes Layer
    const conduitsGroup = new THREE.Group();
    scene.add(conduitsGroup);

    function rebuildProbabilityConduits() {
      while (conduitsGroup.children.length > 0) {
        const child = conduitsGroup.children[0] as THREE.Mesh;
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          (child.material as THREE.Material).dispose();
        }
        conduitsGroup.remove(child);
      }

      const P = matrixRef.current;
      const focusIdx = selectedIdxRef.current;

      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 6; j++) {
          if (i === j) continue;
          const prob = P[i][j];
          if (prob <= 0.01) continue;

          const isFocused = i === focusIdx;
          if (!isFocused && prob < 0.12) continue;

          const startPos = NODE_POSITIONS_3D[i];
          const endPos = NODE_POSITIONS_3D[j];

          const p0 = new THREE.Vector3(startPos.x, 1.05, startPos.z);
          const p2 = new THREE.Vector3(endPos.x, 1.05, endPos.z);
          const mid = new THREE.Vector3()
            .addVectors(p0, p2)
            .multiplyScalar(0.5);
          const dist = p0.distanceTo(p2);
          mid.y += 0.55 + dist * 0.18 + (i > j ? 0.35 : 0);

          const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
          const radius = isFocused
            ? Math.max(0.025, Math.min(0.085, 0.02 + prob * 0.12))
            : 0.016;
          const tubeGeo = new THREE.TubeGeometry(curve, 20, radius, 8, false);

          let tubeHex = 0x0284c7;
          if (j === 4) tubeHex = 0x10b981;
          else if (j === 5) tubeHex = 0xf43f5e;
          else if (i === 3 || j === 3) tubeHex = 0xf59e0b;

          const tubeMat = new THREE.MeshStandardMaterial({
            color: tubeHex,
            emissive: tubeHex,
            emissiveIntensity: isFocused ? 0.35 : 0.1,
            roughness: 0.25,
            metalness: 0.3,
            transparent: true,
            opacity: isFocused ? 0.9 : 0.28,
          });

          const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
          conduitsGroup.add(tubeMesh);
        }
      }
    }

    rebuildProbabilityConduits();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minDistance = 4.0;
    controls.maxDistance = 16.0;
    controls.target.copy(CAMERA_PRESETS.overview.target);

    let activeCamTargetPos: THREE.Vector3 | null = null;
    let activeCamLookAt: THREE.Vector3 | null = null;
    let currentExploded = 0;

    controls.addEventListener('start', () => {
      activeCamTargetPos = null;
      activeCamLookAt = null;
    });

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function updateSceneKinematics(dt: number) {
      let needsAnotherFrame = false;

      const targetExploded = explodedTargetRef.current;
      if (Math.abs(currentExploded - targetExploded) > 0.002) {
        currentExploded = THREE.MathUtils.damp(
          currentExploded,
          targetExploded,
          8,
          dt
        );
        needsAnotherFrame = true;
      } else {
        currentExploded = targetExploded;
      }

      const focusIdx = selectedIdxRef.current;
      const simIdx = activeSimRef.current;

      nodeGroups.forEach((item, idx) => {
        const isSelected = idx === focusIdx;
        const isSimActive = idx === simIdx;

        item.selectionHalo.visible = isSelected || isSimActive;
        const haloMat = item.selectionHalo.material as THREE.MeshBasicMaterial;
        haloMat.color.setHex(
          isSimActive ? 0x10b981 : NODE_META_3D[idx].hex
        );

        const lift = currentExploded * 0.55;
        item.coreMesh.position.y = 1.05 + lift;
        item.glassShell.position.y = 1.05 + lift * 1.45;
        item.gyroRing1.position.y = 1.05 + lift * 1.15;
        item.gyroRing2.position.y = 1.05 + lift * 1.15;
        item.badgeSprite.position.y = 2.15 + lift * 1.65;

        const targetScale = isSimActive ? 1.18 : isSelected ? 1.1 : 1.0;
        item.glassShell.scale.setScalar(targetScale);
      });

      if (activeCamTargetPos && activeCamLookAt) {
        const alpha = 1 - Math.exp(-7 * dt);
        camera.position.lerp(activeCamTargetPos, alpha);
        controls.target.lerp(activeCamLookAt, alpha);

        if (
          camera.position.distanceTo(activeCamTargetPos) < 0.03 &&
          controls.target.distanceTo(activeCamLookAt) < 0.03
        ) {
          camera.position.copy(activeCamTargetPos);
          controls.target.copy(activeCamLookAt);
          activeCamTargetPos = null;
          activeCamLookAt = null;
        } else {
          needsAnotherFrame = true;
        }
      }

      controls.update();
      return needsAnotherFrame;
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const dt = Math.min(clock.getDelta(), 0.1) || 0.016;
        const keepAnimating = updateSceneKinematics(dt);
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || keepAnimating) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = () => {
      rebuildProbabilityConduits();
      requestRender();
    };

    triggerCameraPresetRef.current = (preset: CameraPresetKey) => {
      const cfg = CAMERA_PRESETS[preset];
      activeCamTargetPos = cfg.pos.clone();
      activeCamLookAt = cfg.target.clone();
      requestRender();
    };

    controls.addEventListener('change', () => {
      requestRender();
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactableCoreMeshes, false);
      if (hits.length > 0) {
        const nodeIdx = hits[0].object.userData?.nodeIndex;
        if (typeof nodeIdx === 'number' && nodeIdx >= 0 && nodeIdx < 4) {
          onSelectNodeRef.current(nodeIdx);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 310;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };

    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (requestRenderRef.current) {
      requestRenderRef.current();
    }
  }, [matrix, selectedNodeIndex, activeSimNode, explodedFactor]);

  const handleSelectCameraPreset = (preset: CameraPresetKey) => {
    setCameraPreset(preset);
    if (triggerCameraPresetRef.current) {
      triggerCameraPresetRef.current(preset);
    }
  };

  return (
    <div className="relative w-full h-[325px] rounded-xl overflow-hidden border border-slate-200/90 bg-[#F1F5F9] mb-3">
      {/* Isolated WebGL Mount Container */}
      <div
        ref={mountRef}
        data-testid="markov-3d-canvas"
        className="w-full h-full"
      />

      {/* Minimal Top-Left Hint Overlay */}
      <div className="absolute top-2.5 left-3 pointer-events-none select-none">
        <span className="text-[11px] font-mono-tabular font-medium text-slate-500">
          3D Glass Stage · Drag to Orbit · Click S1–S4
        </span>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[94%] max-w-[560px] z-10 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="px-2.5 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 webgl-hud-dock rounded-t-md border-b-0 cursor-pointer transition-colors"
        >
          {dockCollapsed ? '▴ Controls' : '▾ Controls'}
        </button>

        {!dockCollapsed && (
          <div className="w-full webgl-hud-dock rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="3D Camera View Presets"
            >
              {(
                [
                  { key: 'overview', label: 'Overview' },
                  { key: 'transient', label: 'GPA Arc' },
                  { key: 'stress', label: 'S4 Stress' },
                  { key: 'absorbing', label: 'Outcomes' },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSelectCameraPreset(item.key)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    cameraPreset === item.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="explodedViewSlider"
                className="text-[11px] font-medium text-slate-600 whitespace-nowrap"
              >
                Explode: {Math.round(explodedFactor * 100)}%
              </label>
              <input
                id="explodedViewSlider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={explodedFactor}
                onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
                className="w-20 accent-sky-600 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
