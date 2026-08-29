"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function FaultlineScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x110718, 0.055);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.6, 9.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const world = new THREE.Group();
    scene.add(world);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 5),
      new THREE.MeshPhysicalMaterial({
        color: 0x5b21b6,
        emissive: 0x8b2cff,
        emissiveIntensity: 1.8,
        roughness: 0.13,
        metalness: 0.2,
        transmission: 0.3,
        thickness: 1.2,
        clearcoat: 1,
      }),
    );
    core.position.y = 0.65;
    world.add(core);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.48, 0.018, 12, 160),
      new THREE.MeshBasicMaterial({ color: 0xd8b4fe, transparent: true, opacity: 0.55 }),
    );
    halo.rotation.x = 1.12;
    halo.rotation.z = -0.3;
    halo.position.copy(core.position);
    world.add(halo);

    const particles = new THREE.BufferGeometry();
    const count = 900;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const lavender = new THREE.Color(0xc4b5fd);
    const violet = new THREE.Color(0x6d28d9);
    for (let index = 0; index < count; index += 1) {
      const radius = 2.2 + Math.random() * 7;
      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 2.6;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = -1.45 + Math.random() * 1.15 + Math.sin(radius * 2.3) * 0.12;
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.45 + spread;
      const color = lavender.clone().lerp(violet, Math.random());
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const field = new THREE.Points(
      particles,
      new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false }),
    );
    world.add(field);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 11, 70, 40),
      new THREE.MeshBasicMaterial({ color: 0x2b0a3d, wireframe: true, transparent: true, opacity: 0.14 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.55;
    floor.position.z = -0.8;
    world.add(floor);

    const key = new THREE.PointLight(0xc084fc, 35, 18);
    key.position.set(2, 4, 4);
    scene.add(key);
    const rim = new THREE.PointLight(0x4f46e5, 24, 15);
    rim.position.set(-4, 1, -2);
    scene.add(rim);

    let pointerX = 0;
    let pointerY = 0;
    const onPointer = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.6;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.35;
    };
    mount.addEventListener("pointermove", onPointer);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let frame = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      core.rotation.y = time * 0.18;
      core.rotation.x = Math.sin(time * 0.4) * 0.08;
      core.position.y = 0.65 + Math.sin(time * 0.8) * 0.08;
      halo.position.y = core.position.y;
      halo.rotation.z = -0.3 + time * 0.08;
      field.rotation.y = time * 0.012;
      world.rotation.y += (pointerX - world.rotation.y) * 0.025;
      world.rotation.x += (-pointerY - world.rotation.x) * 0.025;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mount.removeEventListener("pointermove", onPointer);
      world.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="faultline-scene" aria-hidden="true" />;
}
