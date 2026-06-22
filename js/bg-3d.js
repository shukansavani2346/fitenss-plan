// FitBharat - 3D WebGL Background Engine (Vanilla Three.js)

(function () {
  // 1. WebGL Support Verification Check
  function isWebGLSupported() {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  if (!isWebGLSupported()) {
    console.warn("FitBharat WebGL not supported on this device. Falling back to CSS styles.");
    return;
  }

  // 2. Setup Variables
  const canvas = document.getElementById('bg-3d-canvas');
  if (!canvas) return;

  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  let scene, camera, renderer;
  let gymRingsGroup, dumbbellGroup, particleSystem;
  let gridHelper;

  // Interaction tracking (Interpolated)
  let scrollFraction = 0;
  let targetScrollFraction = 0;
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;

  // 3. Initialize Three.js Engine
  function init() {
    scene = new THREE.Scene();

    // Perspective Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: !isMobile // Disable antialias on mobile for performance boost
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0x0f111a, 1.2);
    scene.add(ambientLight);

    // Cyan directional light from top right
    const cyanLight = new THREE.DirectionalLight(0x3b82f6, 2.0);
    cyanLight.position.set(6, 8, 4);
    scene.add(cyanLight);

    // Purple directional light from bottom left
    const purpleLight = new THREE.DirectionalLight(0x8b5cf6, 1.8);
    purpleLight.position.set(-6, -8, 4);
    scene.add(purpleLight);

    // 5. Create Geometries
    createGymRings();
    createDumbbell();
    createParticles();
    createCyberGrid();

    // 6. Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    
    if (!isMobile) {
      window.addEventListener('mousemove', onMouseMove);
    } else {
      window.addEventListener('touchmove', onTouchMove, { passive: true });
    }

    // Trigger initial positioning
    onWindowScroll();

    // Start Engine Loop
    animate();
  }

  // 6a. Gym Rings Procedural Builder
  function createGymRings() {
    gymRingsGroup = new THREE.Group();

    // Torus Geometry for Rings (radius, tube, radialSegments, tubularSegments)
    const torusGeo = new THREE.TorusGeometry(1.2, 0.16, 16, 64);
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      metalness: 0.9,
      roughness: 0.15
    });

    const ring1 = new THREE.Mesh(torusGeo, metalMat);
    ring1.position.x = -1.4;
    ring1.rotation.y = Math.PI / 12;

    const ring2 = new THREE.Mesh(torusGeo, metalMat);
    ring2.position.x = 1.4;
    ring2.rotation.y = -Math.PI / 12;

    // Connect straps (long cylinders extending upwards)
    const strapGeo = new THREE.CylinderGeometry(0.04, 0.04, 20, 8);
    const strapMat = new THREE.MeshBasicMaterial({ color: 0x0a0b12 });
    
    const strap1 = new THREE.Mesh(strapGeo, strapMat);
    strap1.position.set(-1.4, 10, 0);
    
    const strap2 = new THREE.Mesh(strapGeo, strapMat);
    strap2.position.set(1.4, 10, 0);

    gymRingsGroup.add(ring1);
    gymRingsGroup.add(ring2);
    gymRingsGroup.add(strap1);
    gymRingsGroup.add(strap2);

    // Initial position on Overview page left side
    gymRingsGroup.position.set(-5.0, 3, -1);
    scene.add(gymRingsGroup);
  }

  // 6b. Dumbbell Procedural Builder
  function createDumbbell() {
    dumbbellGroup = new THREE.Group();

    // Steel materials
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.95,
      roughness: 0.08
    });
    const blackIronMat = new THREE.MeshStandardMaterial({
      color: 0x1c1d24,
      metalness: 0.8,
      roughness: 0.35
    });

    // Central handle
    const handleGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.4, 32);
    const handle = new THREE.Mesh(handleGeo, chromeMat);
    handle.rotation.z = Math.PI / 2;
    dumbbellGroup.add(handle);

    // Inner heavy plates (larger)
    const plateGeo1 = new THREE.CylinderGeometry(0.9, 0.9, 0.4, 32);
    const innerPlateL = new THREE.Mesh(plateGeo1, blackIronMat);
    innerPlateL.rotation.z = Math.PI / 2;
    innerPlateL.position.x = -1.1;

    const innerPlateR = new THREE.Mesh(plateGeo1, blackIronMat);
    innerPlateR.rotation.z = Math.PI / 2;
    innerPlateR.position.x = 1.1;
    
    dumbbellGroup.add(innerPlateL);
    dumbbellGroup.add(innerPlateR);

    // Outer plates (smaller)
    const plateGeo2 = new THREE.CylinderGeometry(0.75, 0.75, 0.35, 32);
    const outerPlateL = new THREE.Mesh(plateGeo2, blackIronMat);
    outerPlateL.rotation.z = Math.PI / 2;
    outerPlateL.position.x = -1.5;

    const outerPlateR = new THREE.Mesh(plateGeo2, blackIronMat);
    outerPlateR.rotation.z = Math.PI / 2;
    outerPlateR.position.x = 1.5;
    
    dumbbellGroup.add(outerPlateL);
    dumbbellGroup.add(outerPlateR);

    // Chrome collars/nuts at the end
    const nutGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16);
    const nutL = new THREE.Mesh(nutGeo, chromeMat);
    nutL.rotation.z = Math.PI / 2;
    nutL.position.x = -1.75;

    const nutR = new THREE.Mesh(nutGeo, chromeMat);
    nutR.rotation.z = Math.PI / 2;
    nutR.position.x = 1.75;
    
    dumbbellGroup.add(nutL);
    dumbbellGroup.add(nutR);

    // Initial position on Overview page right side
    dumbbellGroup.position.set(5.0, -3.5, -1);
    dumbbellGroup.rotation.set(0.6, 0.8, -0.4);
    scene.add(dumbbellGroup);
  }

  // 6c. Drifting Atmospheric Particles
  function createParticles() {
    const pCount = isMobile ? 350 : 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 36;     // X
      positions[i * 3 + 1] = (Math.random() - 0.5) * 36; // Y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // Z
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.05 : 0.08,
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
  }

  // 6d. Cyber Grid Floor Helper
  function createCyberGrid() {
    // grid size: 100, divisions: 40
    gridHelper = new THREE.GridHelper(100, 45, 0x3b82f6, 0x14162a);
    gridHelper.position.set(0, -9.5, -4);
    gridHelper.rotation.x = Math.PI / 18; // Tilt grid for depth
    gridHelper.material.opacity = 0.12;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
  }

  // 7. Event Handlers
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onWindowScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    targetScrollFraction = scrollY / maxScroll;
  }

  function onMouseMove(event) {
    targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  function onTouchMove(event) {
    if (event.touches.length > 0) {
      targetMouseX = (event.touches[0].clientX / window.innerWidth - 0.5) * 1.5;
    }
  }

  // 8. Animation & Render Loop (Smooth LERPing)
  function animate() {
    requestAnimationFrame(animate);

    // Apply linear interpolation for smooth camera transitions
    scrollFraction += (targetScrollFraction - scrollFraction) * 0.06;
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    // Camera movement (Parallax)
    camera.position.x = mouseX * 2.0;
    // As user scrolls down, camera moves down
    camera.position.y = -scrollFraction * 7.5 - mouseY * 1.0;
    camera.lookAt(0, -scrollFraction * 4.5, -4);

    // Rotate & hover gymnastic rings
    if (gymRingsGroup) {
      gymRingsGroup.rotation.y += 0.002;
      gymRingsGroup.rotation.x = Math.sin(Date.now() * 0.0006) * 0.08;
      gymRingsGroup.position.y = 2.5 + Math.sin(Date.now() * 0.0008) * 0.2;
    }

    // Rotate & hover dumbbell
    if (dumbbellGroup) {
      dumbbellGroup.rotation.y -= 0.003;
      dumbbellGroup.rotation.z += 0.0015;
      dumbbellGroup.position.y = -3.5 + Math.cos(Date.now() * 0.0007) * 0.2;
    }

    // Rotate particle system slowly for cosmic dust effect
    if (particleSystem) {
      particleSystem.rotation.y += 0.0008;
      particleSystem.rotation.x += 0.0003;
    }

    // Slow warp on grid floor
    if (gridHelper) {
      gridHelper.position.z = -4 + Math.sin(Date.now() * 0.0005) * 0.5;
    }

    renderer.render(scene, camera);
  }

  // Initialize on script load
  init();
})();
