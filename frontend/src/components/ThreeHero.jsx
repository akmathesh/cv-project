import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Simple Three.js hero: a rotating wireframe icosahedron core with
 * orbiting glowing spheres and a particle halo. Reacts to the mouse.
 */
export default function ThreeHero() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // core
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ color: 0x7c3aed, wireframe: true })
    );
    scene.add(core);

    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 0),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true })
    );
    scene.add(inner);

    // orbiting spheres
    const orbiters = [];
    const colors = [0xec4899, 0x06b6d4, 0x8b5cf6, 0xf59e0b];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 16),
        new THREE.MeshBasicMaterial({ color: colors[i] })
      );
      const orbiter = { mesh: s, radius: 2.3 + i * 0.35, speed: 0.4 + i * 0.15, angle: Math.random() * Math.PI * 2, tilt: i * 0.5 };
      orbiters.push(orbiter);
      scene.add(s);
    }

    // halo particles
    const haloGeo = new THREE.BufferGeometry();
    const haloCount = 500;
    const pos = new Float32Array(haloCount * 3);
    for (let i = 0; i < haloCount; i++) {
      const r = 3 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    haloGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const halo = new THREE.Points(
      haloGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.7 })
    );
    scene.add(halo);

    const mouse = { x: 0, y: 0 };
    const onMouse = (e) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      core.rotation.x = t * 0.25 + mouse.y * 0.4;
      core.rotation.y = t * 0.35 + mouse.x * 0.6;
      inner.rotation.x = -t * 0.4;
      inner.rotation.y = -t * 0.3;
      halo.rotation.y = t * 0.06;
      for (const o of orbiters) {
        o.angle += o.speed * 0.01;
        o.mesh.position.set(
          Math.cos(o.angle) * o.radius,
          Math.sin(o.angle * 1.3) * o.radius * Math.sin(o.tilt) * 0.6,
          Math.sin(o.angle) * o.radius
        );
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
