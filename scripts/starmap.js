/* ============================================
   OSR — Operational Signal Reconnaissance
   3D Starmap WebGL Engine (Three.js)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure we are on the starmap page
  const canvasContainer = document.getElementById('starmap-canvas-container');
  if (!canvasContainer) return;

  /* ==========================================
     1. STAR SYSTEM DATA (Fetched from API)
     ========================================== */
  let starSystems = {};
  
  try {
    const response = await fetch('data/starmap.json');
    if (!response.ok) throw new Error('Failed to fetch starmap data');
    starSystems = await response.json();
  } catch (error) {
    console.error('Error loading starmap API:', error);
    return;
  }

  /* ==========================================
     2. THREE.JS INITIALIZATION & SCENE SETUP
     ========================================== */
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  // Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02070e, 0.015);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 70, 90);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x02070e, 1);
  canvasContainer.appendChild(renderer.domElement);

  // Orbit Controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.maxDistance = 180;
  controls.minDistance = 8;
  controls.maxPolarAngle = Math.PI / 2 + 0.1; // Limit panning under the grid slightly

  // Lights
  const ambientLight = new THREE.AmbientLight(0x223344, 1.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 20, 10);
  scene.add(dirLight);

  /* ==========================================
     3. GRID & BACKGROUND SYSTEMS
     ========================================== */
  // Coordinate Tactical Grid
  const gridHelper = new THREE.GridHelper(200, 40, 0x00e5ff, 0x0a1628);
  gridHelper.position.y = -5;
  gridHelper.material.opacity = 0.12;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // Ambient Starfield Particles
  const starfieldGeo = new THREE.BufferGeometry();
  const starCount = 3500;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    // Distribute stars in a large box
    starPositions[i * 3] = (Math.random() - 0.5) * 350;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 200;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 350;

    // Distribute star colors (mostly blue/white/yellow)
    const rand = Math.random();
    if (rand > 0.8) {
      starColors[i * 3] = 0.8; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 1.0; // Blue-white
    } else if (rand > 0.6) {
      starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 0.7; // Yellow-ish
    } else {
      starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0; // White
    }
  }

  starfieldGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starfieldGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  // Small circle sprite for star particles
  const starCanvas = document.createElement('canvas');
  starCanvas.width = 16;
  starCanvas.height = 16;
  const starCtx = starCanvas.getContext('2d');
  const gradient = starCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  starCtx.fillStyle = gradient;
  starCtx.fillRect(0, 0, 16, 16);

  const starTexture = new THREE.CanvasTexture(starCanvas);
  const starMaterial = new THREE.PointsMaterial({
    size: 0.6,
    map: starTexture,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const starField = new THREE.Points(starfieldGeo, starMaterial);
  scene.add(starField);

  /* ==========================================
     4. GALAXY SYSTEM GENERATION
     ========================================== */
  const starGroups = {}; // Stores THREE.Group objects for raycasting
  const labelElements = []; // Stores DOM label overlays
  const labelContainer = document.getElementById('starmap-labels-container');

  // Radial glow canvas sprite for stars
  function createGlowTexture(colorStr) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, colorStr.replace(')', ', 0.8)'));
    grad.addColorStop(0.5, colorStr.replace(')', ', 0.2)'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  // Generate system 3D nodes
  Object.values(starSystems).forEach(sys => {
    const group = new THREE.Group();
    group.position.set(sys.coordinates.x, sys.coordinates.y, sys.coordinates.z);
    group.userData = { id: sys.id, name: sys.name, faction: sys.faction };

    // Core Star Mesh
    const starGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const starMat = new THREE.MeshBasicMaterial({ color: sys.color });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    group.add(starMesh);

    // Glowing Halo Sprite
    // Convert hex color to rgb-string for alpha grad compatibility
    const tempColor = new THREE.Color(sys.color);
    const rgbStr = `rgba(${Math.floor(tempColor.r * 255)}, ${Math.floor(tempColor.g * 255)}, ${Math.floor(tempColor.b * 255)})`;
    const glowTex = createGlowTexture(rgbStr);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(6, 6, 1);
    group.add(glowSprite);

    // Dynamic Faction Halo indicator
    let factionColorHex = '#00e5ff'; // UEE
    if (sys.faction === 'unclaimed') factionColorHex = '#ffab00'; // Outlaw
    else if (sys.faction === 'independent') factionColorHex = '#00e676'; // Independent
    else if (sys.faction === 'vanduul') factionColorHex = '#ff1744'; // Vanduul

    const ringGeo = new THREE.RingGeometry(1.6, 1.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: factionColorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);

    // System Local Light
    const pointLight = new THREE.PointLight(sys.color, 1.2, 25);
    group.add(pointLight);

    scene.add(group);
    starGroups[sys.id] = group;

    // Create projected HTML tag label
    const label = document.createElement('div');
    label.className = `starmap-label faction-${sys.faction}`;
    label.textContent = sys.name;
    labelContainer.appendChild(label);
    labelElements.push({ element: label, position: group.position, id: sys.id });
  });

  // Generate Jump point routes
  const jumpLineMaterial = new THREE.LineDashedMaterial({
    color: 0x00e5ff,
    dashSize: 1.5,
    gapSize: 1,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });

  const jumpLines = [];
  const processedJumps = new Set();

  Object.values(starSystems).forEach(sys => {
    sys.jumps.forEach(targetId => {
      const target = starSystems[targetId];
      if (!target) return;

      // Unique route ID key to avoid double rendering
      const routeKey = [sys.id, targetId].sort().join('-');
      if (processedJumps.has(routeKey)) return;
      processedJumps.add(routeKey);

      const points = [];
      points.push(new THREE.Vector3(sys.coordinates.x, sys.coordinates.y, sys.coordinates.z));
      points.push(new THREE.Vector3(target.coordinates.x, target.coordinates.y, target.coordinates.z));

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, jumpLineMaterial.clone());
      line.computeLineDistances(); // Required for dashed rendering
      scene.add(line);

      // Store jump routes to animate them
      jumpLines.push({
        line: line,
        faction1: sys.faction,
        faction2: target.faction
      });
    });
  });

  /* ==========================================
     5. FOCUSED SYSTEM "ORBIT VIEW" RENDERER
     ========================================== */
  let activeSystemId = null;
  let systemViewActive = false;
  let localPlanets = []; // Hold current loaded planet meshes
  let localOrbitLines = []; // Hold current loaded orbit path circles
  let localStarGroup = null; // Holds detailed star when zoomed in

  function enterSystemView(systemId) {
    const sys = starSystems[systemId];
    if (!sys) return;

    activeSystemId = systemId;
    systemViewActive = true;

    // Clear previous details if any
    exitSystemView(false);

    // Zoom Camera smoothly
    tweenCamera(sys.coordinates, 24);

    // Hide global grid, star labels and connections
    gridHelper.visible = false;
    labelElements.forEach(item => {
      if (item.id !== systemId) item.element.style.opacity = '0';
    });

    // Create system detail local group
    localStarGroup = new THREE.Group();
    localStarGroup.position.set(sys.coordinates.x, sys.coordinates.y, sys.coordinates.z);

    // Add local planets
    sys.planets.forEach(p => {
      const planetPivot = new THREE.Group();
      localStarGroup.add(planetPivot);

      // Planet Orbit Path Ring
      const orbitGeo = new THREE.RingGeometry(p.distance - 0.05, p.distance + 0.05, 64);
      const orbitMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide
      });
      const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
      orbitMesh.rotation.x = Math.PI / 2;
      localStarGroup.add(orbitMesh);
      localOrbitLines.push(orbitMesh);

      // Planet Mesh
      const planetGeo = new THREE.SphereGeometry(p.size, 16, 16);
      const planetMat = new THREE.MeshStandardMaterial({
        color: p.color,
        roughness: 0.8,
        metalness: 0.1
      });
      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      planetMesh.position.x = p.distance;
      planetPivot.add(planetMesh);

      // Store animation metadata
      localPlanets.push({
        pivot: planetPivot,
        mesh: planetMesh,
        speed: p.speed,
        angle: Math.random() * Math.PI * 2,
        name: p.name,
        type: p.type
      });

      // Add HTML labels for planets in orbit
      const pLabel = document.createElement('div');
      pLabel.className = 'starmap-label';
      pLabel.style.color = '#ffab00'; // Orange accent for planets
      pLabel.style.borderLeftColor = '#ffab00';
      pLabel.textContent = p.name;
      labelContainer.appendChild(pLabel);
      labelElements.push({ element: pLabel, position: planetMesh.position, isPlanet: true, pivot: planetPivot, parentPos: localStarGroup.position });
    });

    scene.add(localStarGroup);

    // Hide other system spheres slightly
    Object.keys(starGroups).forEach(id => {
      if (id !== systemId) starGroups[id].visible = false;
    });

    // Populate Right HUD Telemetry Panel
    updateHUDDetails(sys);
    document.getElementById('hud-panel-right').classList.add('active');

    // Update left system list active item
    updateSystemListUI(systemId);
  }

  function exitSystemView(resetCamera = true) {
    systemViewActive = false;
    activeSystemId = null;

    // Reset grid and labels visibility
    gridHelper.visible = true;
    labelElements.forEach((item, index) => {
      item.element.style.opacity = '1';
    });

    // Clean up planet labels
    const planetLabels = labelElements.filter(item => item.isPlanet);
    planetLabels.forEach(item => {
      if (item.element.parentNode) item.element.parentNode.removeChild(item.element);
    });
    // Remove planets from labelElements tracking array
    for (let i = labelElements.length - 1; i >= 0; i--) {
      if (labelElements[i].isPlanet) labelElements.splice(i, 1);
    }

    // Clean up planets meshes
    if (localStarGroup) {
      scene.remove(localStarGroup);
      localStarGroup = null;
    }
    localPlanets = [];
    localOrbitLines = [];

    // Show all system nodes again
    Object.keys(starGroups).forEach(id => {
      starGroups[id].visible = true;
    });

    // Hide right details panel
    document.getElementById('hud-panel-right').classList.remove('active');

    // Remove active highlight in system list
    updateSystemListUI(null);

    // Zoom back out to sector view
    if (resetCamera) {
      tweenCamera({ x: 0, y: 0, z: 0 }, 110);
    }
  }

  /* ==========================================
     6. INTERACTIVE HUD CONTROLLER (DATA BINDING)
     ========================================== */
  const searchInput = document.getElementById('starmap-search');
  const systemListContainer = document.getElementById('starmap-system-list');
  const returnBtn = document.getElementById('starmap-reset');

  // Populate System List on Left Panel
  function buildSystemList(filteredList = Object.values(starSystems)) {
    systemListContainer.innerHTML = '';
    filteredList.forEach(sys => {
      const li = document.createElement('li');
      li.className = `system-list-item faction-${sys.faction}`;
      li.id = `list-item-${sys.id}`;
      li.innerHTML = `
        <button type="button">
          <span>${sys.name}</span>
          <span class="system-list-item-faction">${sys.faction.toUpperCase()}</span>
        </button>
      `;
      li.addEventListener('click', () => {
        enterSystemView(sys.id);
      });
      systemListContainer.appendChild(li);
    });
  }

  function updateSystemListUI(activeId) {
    const items = systemListContainer.querySelectorAll('.system-list-item');
    items.forEach(item => {
      item.classList.remove('active');
      if (activeId && item.id === `list-item-${activeId}`) {
        item.classList.add('active');
      }
    });
  }

  // Populate Right Telemetry details
  function updateHUDDetails(sys) {
    document.getElementById('telemetry-name').textContent = sys.name;
    document.getElementById('telemetry-class').textContent = sys.spectralClass;
    document.getElementById('telemetry-coords').textContent = `X: ${sys.coordinates.x.toFixed(1)} / Y: ${sys.coordinates.y.toFixed(1)} / Z: ${sys.coordinates.z.toFixed(1)}`;

    const factionEl = document.getElementById('telemetry-faction');
    factionEl.textContent = sys.factionName;
    factionEl.className = `telemetry-value ${sys.faction}`;

    document.getElementById('telemetry-security').textContent = sys.security;
    document.getElementById('telemetry-economy').textContent = sys.economy;
    document.getElementById('telemetry-description').textContent = sys.description;

    // Connected Jumps List
    const jumpListEl = document.getElementById('telemetry-jumps');
    jumpListEl.innerHTML = '';
    sys.jumps.forEach(jumpId => {
      const jumpSys = starSystems[jumpId];
      if (jumpSys) {
        const li = document.createElement('li');
        li.className = 'detail-list-item';
        li.innerHTML = `
          <button class="jump-link">${jumpSys.name}</button>
          <span class="detail-list-item-type">JUMP POINT</span>
        `;
        li.querySelector('button').addEventListener('click', () => {
          enterSystemView(jumpId);
        });
        jumpListEl.appendChild(li);
      }
    });

    // Orbiting Bodies List
    const bodyListEl = document.getElementById('telemetry-bodies');
    bodyListEl.innerHTML = '';
    sys.planets.forEach(p => {
      const li = document.createElement('li');
      li.className = 'detail-list-item';
      li.innerHTML = `
        <span class="detail-list-item-name">${p.name}</span>
        <span class="detail-list-item-type">${p.type}</span>
      `;
      bodyListEl.appendChild(li);
    });

    // Major Stations List
    const stationListEl = document.getElementById('telemetry-stations');
    stationListEl.innerHTML = '';
    if (sys.stations && sys.stations.length > 0) {
      sys.stations.forEach(s => {
        const li = document.createElement('li');
        li.className = 'detail-list-item';
        li.innerHTML = `
          <span class="detail-list-item-name">${s.name}</span>
          <span class="detail-list-item-type">${s.type}</span>
        `;
        stationListEl.appendChild(li);
      });
    } else {
      stationListEl.innerHTML = '<li class="detail-list-item"><span class="detail-list-item-type">NO STATIONS DETECTED</span></li>';
    }
  }

  // Faction overlays filter
  let activeFactionFilter = 'all';
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const faction = btn.getAttribute('data-faction');
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFactionFilter = faction;
      applyFactionFilters();
    });
  });

  function applyFactionFilters() {
    const list = Object.values(starSystems).filter(sys => {
      return activeFactionFilter === 'all' || sys.faction === activeFactionFilter;
    });
    buildSystemList(list);

    // Modify 3D rendering opacity based on filter
    Object.values(starSystems).forEach(sys => {
      const group = starGroups[sys.id];
      const label = labelElements.find(l => l.id === sys.id);
      const matchesFilter = activeFactionFilter === 'all' || sys.faction === activeFactionFilter;

      if (group) {
        // Fade out non-matches, keep active ones
        group.traverse(child => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = matchesFilter ? (child.isSprite ? 1.0 : 0.6) : 0.15;
          }
        });
      }

      if (label && label.element) {
        label.element.style.opacity = matchesFilter ? '1' : '0.2';
      }
    });

    // Fade out jump lines that aren't matching
    jumpLines.forEach(item => {
      const match1 = activeFactionFilter === 'all' || item.faction1 === activeFactionFilter;
      const match2 = activeFactionFilter === 'all' || item.faction2 === activeFactionFilter;
      item.line.material.opacity = (match1 && match2) ? 0.35 : 0.05;
    });
  }

  // Search input listeners
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      applyFactionFilters();
      return;
    }

    const filtered = Object.values(starSystems).filter(sys => {
      // Matches system name OR any planet inside it
      const nameMatch = sys.name.toLowerCase().includes(query);
      const planetMatch = sys.planets.some(p => p.name.toLowerCase().includes(query));
      return nameMatch || planetMatch;
    });

    buildSystemList(filtered);

    // If query matches a system exactly, focus on it
    const exactMatch = Object.values(starSystems).find(sys => sys.name.toLowerCase() === query);
    if (exactMatch) {
      enterSystemView(exactMatch.id);
    }
  });

  returnBtn.addEventListener('click', () => {
    searchInput.value = '';
    exitSystemView();
    applyFactionFilters();
  });

  /* ==========================================
     7. RAYCASTING INTERACTIVE 3D SELECTION
     ========================================== */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredStarId = null;

  window.addEventListener('mousemove', (e) => {
    // Get mouse position relative to canvas container
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  window.addEventListener('click', () => {
    if (systemViewActive) return; // Ignore clicks on global stars when in system view
    
    // Check if clicked a star node
    raycaster.setFromCamera(mouse, camera);
    const meshes = Object.values(starGroups).map(g => g.children[0]); // Check the sphere mesh first
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const sysId = clickedMesh.parent.userData.id;
      enterSystemView(sysId);
    }
  });

  /* ==========================================
     8. CAMERA LERP TWEEN ANIMATIONS
     ========================================== */
  let cameraTargetPos = null;
  let controlsTargetLook = null;
  let tweenProgress = 1;

  function tweenCamera(lookAtPos, zoomDistance) {
    // Determine target positions
    controlsTargetLook = new THREE.Vector3(lookAtPos.x, lookAtPos.y, lookAtPos.z);

    // Calculate camera target offset
    cameraTargetPos = new THREE.Vector3(
      lookAtPos.x + 0.1, // Slight offset to avoid gimbal lock
      lookAtPos.y + zoomDistance * 0.7,
      lookAtPos.z + zoomDistance * 0.7
    );

    tweenProgress = 0;
  }

  /* ==========================================
     9. ANIMATION LOOP & PROJECTED UI TAGS
     ========================================== */
  buildSystemList();
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. Animate camera and controls using LERP tweening
    if (tweenProgress < 1) {
      tweenProgress += delta * 1.5; // Controls speed of transit
      if (tweenProgress > 1) tweenProgress = 1;

      // Interpolate camera position
      camera.position.lerp(cameraTargetPos, tweenProgress);

      // Interpolate controls focus point
      controls.target.lerp(controlsTargetLook, tweenProgress);
    }

    // 2. Animate jump lines (offset dashed line pattern to create flow)
    jumpLines.forEach(item => {
      item.line.material.dashOffset = -time * 1.2;
    });

    // 3. System Orbit View planet revolutions
    if (systemViewActive && localStarGroup) {
      localPlanets.forEach(p => {
        p.angle += p.speed; // Increment orbit angle
        p.pivot.rotation.y = p.angle; // Rotate pivot
      });
    }

    // 4. Update Orbit Controls
    controls.update();

    // 5. Render Scene
    renderer.render(scene, camera);

    // 6. Update 2D Projected labels position overlay
    const tempV = new THREE.Vector3();
    labelElements.forEach(item => {
      if (systemViewActive && !item.isPlanet && item.id !== activeSystemId) {
        item.element.style.opacity = '0';
        return;
      }

      if (item.isPlanet) {
        // Planet labels track their specific mesh relative to the local star pivot
        item.position.getWorldPosition(tempV);
      } else {
        // Star labels track the global group center
        tempV.copy(item.position);
      }

      // Check if coordinate is behind the camera plane
      tempV.project(camera);

      // Convert 3D NDC coordinates (-1 to 1) to HTML screen coordinates (0 to width)
      const rect = renderer.domElement.getBoundingClientRect();
      const x = (tempV.x * 0.5 + 0.5) * rect.width;
      const y = (-(tempV.y * 0.5) + 0.5) * rect.height;

      // Toggle label visibility if behind camera
      if (tempV.z > 1) {
        item.element.style.display = 'none';
      } else {
        item.element.style.display = 'block';
        item.element.style.left = `${x}px`;
        item.element.style.top = `${y}px`;
      }
    });

    // 7. Raycast Mouse Hovers (Recolor halos on hover)
    if (!systemViewActive) {
      raycaster.setFromCamera(mouse, camera);
      const starSpheres = Object.values(starGroups).map(g => g.children[0]);
      const intersects = raycaster.intersectObjects(starSpheres);

      if (intersects.length > 0) {
        const hoveredMesh = intersects[0].object;
        const parentGrp = hoveredMesh.parent;
        const sysId = parentGrp.userData.id;

        if (hoveredStarId !== sysId) {
          // Reset old hover
          if (hoveredStarId && starGroups[hoveredStarId]) {
            starGroups[hoveredStarId].scale.set(1, 1, 1);
            const lbl = labelElements.find(l => l.id === hoveredStarId);
            if (lbl) lbl.element.style.transform = 'translate(-50%, -100%) scale(1)';
          }

          hoveredStarId = sysId;
          // Scale up hovered system node
          parentGrp.scale.set(1.25, 1.25, 1.25);
          // Scale up hovered HTML label
          const lbl = labelElements.find(l => l.id === sysId);
          if (lbl) lbl.element.style.transform = 'translate(-50%, -100%) scale(1.15)';
        }
      } else {
        if (hoveredStarId && starGroups[hoveredStarId]) {
          starGroups[hoveredStarId].scale.set(1, 1, 1);
          const lbl = labelElements.find(l => l.id === hoveredStarId);
          if (lbl) lbl.element.style.transform = 'translate(-50%, -100%) scale(1)';
          hoveredStarId = null;
        }
      }
    }
  }

  // Launch Loop
  buildSystemList();
  initIntelFeed();
  animate();

  /* ==========================================
     10. SIGNAL INTELLIGENCE FEED
     ========================================== */
  async function initIntelFeed() {
    const feedEl = document.getElementById('intel-feed');
    if (!feedEl) return;

    try {
      const response = await fetch('data/intel.json');
      if (!response.ok) throw new Error('Failed to fetch intel data');
      const intelData = await response.json();

      // Clear initial message
      feedEl.innerHTML = '';

      // Sort by timestamp (newest first)
      intelData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      intelData.forEach(item => {
        const entry = document.createElement('div');
        entry.className = 'intel-entry';
        entry.style.cursor = 'pointer'; // Make it look clickable
        
        const date = new Date(item.timestamp);
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} UTC`;

        entry.innerHTML = `
          <div class="intel-header">
            <span class="intel-id">${item.id}</span>
            <span class="intel-loc">${item.system.toUpperCase()} // ${item.location}</span>
            <span class="intel-time">${timeStr}</span>
          </div>
          <div class="intel-body">
            <span class="intel-severity severity-${item.severity.toLowerCase()}">[${item.severity}]</span>
            <span class="intel-type">${item.type}:</span>
            <span class="intel-content">${item.content}</span>
          </div>
        `;

        // Click to focus system
        entry.addEventListener('click', () => {
          if (starSystems[item.system]) {
            enterSystemView(item.system);
          }
        });

        feedEl.appendChild(entry);
      });

      document.getElementById('intel-status').textContent = 'SIGNAL STABLE // ' + intelData.length + ' REPORTS';

      // Setup Report Generator
      const reportBtn = document.getElementById('intel-report-btn');
      if (reportBtn) {
        reportBtn.addEventListener('click', () => {
          const reportText = prompt("Enter intelligence report content:");
          if (!reportText) return;

          const activeSys = starSystems[activeSystemId] || { id: "unknown", name: "UNKNOWN SECTOR" };
          
          const newReport = {
            id: `INTEL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: new Date().toISOString(),
            system: activeSys.id,
            location: activeSys.name === "UNKNOWN SECTOR" ? "DEEP SPACE" : activeSys.name,
            type: "FIELD RECON",
            severity: "MEDIUM",
            content: reportText
          };

          console.log("=== NEW INTEL REPORT GENERATED ===");
          console.log(JSON.stringify(newReport, null, 2));
          console.log("==================================");
          alert("Intel Report generated! Check the browser console (F12) to copy the JSON entry and add it to data/intel.json.");
        });
      }
    } catch (error) {
      console.error('Error loading intel feed:', error);
      feedEl.innerHTML = '<div class="intel-entry severity-critical">SIGNAL INTERFERENCE DETECTED // LINK FAILED</div>';
      document.getElementById('intel-status').textContent = 'LINK OFFLINE';
    }
  }

  // Resize Handler
  window.addEventListener('resize', () => {
    const newWidth = canvasContainer.clientWidth;
    const newHeight = canvasContainer.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  });
});
