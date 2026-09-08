import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const canvas = document.querySelector('[data-hero-webgl]');
const hero = document.querySelector('.hero');

if (canvas && hero && window.WebGL2RenderingContext) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    camera.position.set(0, 0, 10);

    const blinds = new THREE.Group();
    scene.add(blinds);

    const slatGeometry = new THREE.BoxGeometry(0.18, 7.4, 0.16, 1, 1, 1);
    const slatMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x765783,
      roughness: 0.42,
      metalness: 0.06,
      clearcoat: 0.18,
      clearcoatRoughness: 0.7,
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e2234,
      roughness: 0.66,
    });

    const slats = [];
    for (let index = 0; index < 24; index += 1) {
      const slat = new THREE.Mesh(slatGeometry, index % 3 === 0 ? edgeMaterial : slatMaterial);
      slat.position.x = index * 0.245;
      slat.userData.phase = index * 0.19;
      blinds.add(slat);
      slats.push(slat);
    }

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(6.05, 0.12, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x3a2b41, roughness: 0.55 }),
    );
    rail.position.set(2.82, 3.66, 0);
    blinds.add(rail);

    const ambient = new THREE.HemisphereLight(0xf0dcff, 0x17111b, 1.2);
    scene.add(ambient);
    const daylight = new THREE.DirectionalLight(0xffe3b6, 4.2);
    daylight.position.set(5, 3, 6);
    scene.add(daylight);
    const violetRim = new THREE.PointLight(0xb990d0, 24, 12, 2);
    violetRim.position.set(1.5, 0, 4);
    scene.add(violetRim);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd9a0,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(7, 10), glowMaterial);
    glow.position.set(2.4, 0, -0.6);
    scene.add(glow);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let targetOpen = Number(document.querySelector('[data-light]')?.value || 72) / 100;
    let currentOpen = targetOpen;
    let heroVisible = true;
    let frameId = 0;
    let lastTime = performance.now();

    function resize() {
      const width = hero.clientWidth;
      const height = hero.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const viewWidth = viewHeight * camera.aspect;
      blinds.position.x = viewWidth * 0.12;
      blinds.scale.setScalar(Math.max(0.78, Math.min(1.08, height / 850)));
    }

    function applyLight(open, elapsed) {
      const angle = THREE.MathUtils.lerp(0.05, 1.42, open);
      const compression = THREE.MathUtils.lerp(1, 0.72, open);
      const drift = prefersReducedMotion.matches ? 0 : Math.sin(elapsed * 0.00045) * 0.012;

      slats.forEach((slat) => {
        slat.rotation.y = angle + drift * Math.sin(elapsed * 0.0008 + slat.userData.phase);
      });
      blinds.scale.x = compression;
      daylight.intensity = THREE.MathUtils.lerp(0.7, 5.4, open);
      ambient.intensity = THREE.MathUtils.lerp(0.48, 1.55, open);
      violetRim.intensity = THREE.MathUtils.lerp(30, 9, open);
      glowMaterial.opacity = THREE.MathUtils.lerp(0.02, 0.34, open);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(0.78, 1.18, open);
    }

    function render(time) {
      frameId = 0;
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const easing = prefersReducedMotion.matches ? 1 : 1 - Math.exp(-delta * 12);
      currentOpen = THREE.MathUtils.lerp(currentOpen, targetOpen, easing);
      applyLight(currentOpen, time);
      renderer.render(scene, camera);

      const settling = Math.abs(currentOpen - targetOpen) > 0.001;
      if (heroVisible && !document.hidden && (!prefersReducedMotion.matches || settling)) scheduleRender();
    }

    function scheduleRender() {
      if (!frameId) frameId = requestAnimationFrame(render);
    }

    window.addEventListener('blackout:light', (event) => {
      targetOpen = event.detail.openness;
      scheduleRender();
    });
    window.addEventListener('resize', () => {
      resize();
      scheduleRender();
    }, { passive: true });
    document.addEventListener('visibilitychange', scheduleRender);
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible) scheduleRender();
      else if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    }, { threshold: 0.02 }).observe(hero);

    resize();
    applyLight(currentOpen, performance.now());
    renderer.render(scene, camera);
    document.documentElement.classList.add('webgl-ready');
    scheduleRender();
  } catch (error) {
    console.warn('Three.js hero fallback active.', error);
  }
}
