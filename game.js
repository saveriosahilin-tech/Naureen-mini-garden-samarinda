import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.Fog(0x05070d, 6, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

const flashlight = new THREE.SpotLight(0xb8d6ff, 30, 26, Math.PI / 7, 0.4, 1.2);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(1024, 1024);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

const ambient = new THREE.HemisphereLight(0x7aa3d9, 0x080d13, 0.5);
scene.add(ambient);

const moonLight = new THREE.DirectionalLight(0xaec9ff, 0.35);
moonLight.position.set(-6, 10, 6);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
scene.add(moonLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x101823, roughness: 0.96, metalness: 0.05 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const walls = [];

function addWall(x, z, width, depth, height = 4) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: 0x1a2330, roughness: 0.9, metalness: 0.08 })
  );
  wall.position.set(x, height / 2 - 1.5, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  walls.push({ mesh: wall, halfX: width / 2 + 0.7, halfZ: depth / 2 + 0.7 });
}

addWall(0, 15, 30, 1);
addWall(0, -15, 30, 1);
addWall(15, 0, 1, 30);
addWall(-15, 0, 1, 30);

addWall(0, 0, 10, 1.5);
addWall(-4.5, 4, 1.5, 9);
addWall(4.5, 4, 1.5, 9);
addWall(-4.5, -4, 1.5, 9);
addWall(4.5, -4, 1.5, 9);
addWall(0, -9, 10, 1.5);
addWall(0, 9, 10, 1.5);
addWall(-9, 0, 1.5, 10);
addWall(9, 0, 1.5, 10);

const exitDoor = new THREE.Mesh(
  new THREE.BoxGeometry(2.8, 3.5, 0.5),
  new THREE.MeshStandardMaterial({
    color: 0x17222d,
    emissive: 0x111111,
    emissiveIntensity: 0.8,
    roughness: 0.7,
    metalness: 0.4,
  })
);
exitDoor.position.set(0, 1.1, -12.6);
scene.add(exitDoor);

const exitGlow = new THREE.PointLight(0x75ffb7, 2.5, 10, 2.5);
exitGlow.position.set(0, 1.8, -12.2);
scene.add(exitGlow);

const titleEl = document.getElementById('title');
const objectiveEl = document.getElementById('objective');
const statusEl = document.getElementById('status');
const startOverlay = document.getElementById('startOverlay');
const endOverlay = document.getElementById('endOverlay');
const endTitle = document.getElementById('endTitle');
const endText = document.getElementById('endText');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

const keys = {};
let started = false;
let gameOver = false;
let win = false;
let health = 100;
let totalRelics = 3;
let collectedRelics = 0;
let exitUnlocked = false;

const relics = [];
const relicPositions = [
  new THREE.Vector3(-7.5, 1.2, 7.5),
  new THREE.Vector3(8, 1.2, -8),
  new THREE.Vector3(-8.5, 1.2, -1),
];

function createRelic(position) {
  const group = new THREE.Group();
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({
      color: 0x95c7ff,
      emissive: 0x77d3ff,
      emissiveIntensity: 1.2,
      metalness: 0.15,
      roughness: 0.3,
    })
  );
  crystal.castShadow = true;
  group.add(crystal);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.08, 12, 28),
    new THREE.MeshStandardMaterial({
      color: 0x9fe1ff,
      emissive: 0x7dd9ff,
      emissiveIntensity: 1.8,
    })
  );
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  group.position.copy(position);
  group.userData.baseY = position.y;
  scene.add(group);

  relics.push(group);
}

relicPositions.forEach(createRelic);

const enemy = new THREE.Group();
const enemyBody = new THREE.Mesh(
  new THREE.SphereGeometry(0.7, 24, 24),
  new THREE.MeshStandardMaterial({
    color: 0xe8edf8,
    emissive: 0x88a0ff,
    emissiveIntensity: 0.7,
    roughness: 0.25,
    metalness: 0.08,
    transparent: true,
    opacity: 0.9,
  })
);
enemyBody.castShadow = true;
enemy.add(enemyBody);

const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x0c111c, emissive: 0xfe4e62, emissiveIntensity: 1.7 });
const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeMaterial);
leftEye.position.set(-0.2, 0.1, 0.6);
enemy.add(leftEye);
const rightEye = leftEye.clone();
rightEye.position.x = 0.2;
enemy.add(rightEye);

enemy.position.set(0, 1.3, 10);
scene.add(enemy);

titleEl.textContent = 'Whispers in the Basement';

function updateObjective() {
  if (gameOver || win) return;
  if (collectedRelics < totalRelics) {
    objectiveEl.textContent = `Find the missing relics (${collectedRelics}/${totalRelics}) and leave before the shadow catches you.`;
  } else {
    objectiveEl.textContent = 'The exit is open. Run to the door.';
  }
}

function setHealthText() {
  statusEl.textContent = `Health: ${Math.max(0, Math.ceil(health))}%`;
}

function startGame() {
  started = true;
  controls.lock();
  startOverlay.classList.add('hidden');
  endOverlay.classList.add('hidden');
  if (!gameOver && !win) {
    objectiveEl.textContent = 'Find the missing relics and leave before the shadow catches you.';
  }
}

function endGame(message) {
  gameOver = true;
  endTitle.textContent = message === 'win' ? 'You Escaped' : 'Game Over';
  endText.textContent = message === 'win'
    ? 'The house lets you go. You survived the night.'
    : 'The shadow found you in the dark.';
  endOverlay.classList.remove('hidden');
  controls.unlock();
}

function tryCollectRelic() {
  for (const relic of relics) {
    if (relic.userData.collected) continue;
    const dist = controls.getObject().position.distanceTo(relic.position);
    if (dist < 1.4) {
      relic.userData.collected = true;
      relic.visible = false;
      collectedRelics += 1;
      if (collectedRelics >= totalRelics) {
        exitUnlocked = true;
        exitDoor.material.emissive.setHex(0x52ffbf);
        exitDoor.material.emissiveIntensity = 1.2;
        exitGlow.color.setHex(0x75ffb7);
        exitGlow.intensity = 4;
      }
      updateObjective();
    }
  }
}

function collides(pos) {
  for (const wall of walls) {
    const dx = Math.abs(pos.x - wall.mesh.position.x);
    const dz = Math.abs(pos.z - wall.mesh.position.z);
    if (dx < wall.halfX && dz < wall.halfZ) {
      return true;
    }
  }
  return false;
}

function movePlayer(delta) {
  if (!started || gameOver || win) return;

  const moveX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
  const moveZ = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
  const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 7.2 : 4.6;

  if (moveX !== 0 || moveZ !== 0) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const direction = new THREE.Vector3();
    direction.addScaledVector(forward, moveZ);
    direction.addScaledVector(right, moveX);

    if (direction.lengthSq() > 0) {
      direction.normalize();
      const next = controls.getObject().position.clone();
      next.addScaledVector(direction, speed * delta);
      next.y = 1.7;
      if (!collides(next)) {
        controls.getObject().position.copy(next);
      }
    }
  }

  controls.getObject().position.y = 1.7;

  const bounds = 13.5;
  controls.getObject().position.x = THREE.MathUtils.clamp(controls.getObject().position.x, -bounds, bounds);
  controls.getObject().position.z = THREE.MathUtils.clamp(controls.getObject().position.z, -bounds, bounds);
}

function updateEnemy(delta) {
  if (!started || gameOver || win) return;

  const playerPos = controls.getObject().position.clone();
  const deltaVec = playerPos.clone().sub(enemy.position);
  const distance = deltaVec.length();
  deltaVec.y = 0;
  deltaVec.normalize();

  const chaseSpeed = exitUnlocked ? 2.7 : 1.7;
  const playerDistance = distance;

  if (playerDistance < 15) {
    const nextPos = enemy.position.clone();
    nextPos.addScaledVector(deltaVec, chaseSpeed * delta);
    if (!collides(nextPos)) {
      enemy.position.copy(nextPos);
    }
  } else {
    enemy.position.x += Math.sin(performance.now() * 0.0007 + enemy.position.z) * 0.35 * delta;
    enemy.position.z += Math.cos(performance.now() * 0.0008) * 0.25 * delta;
  }

  enemy.position.y = 1.3;
  enemy.lookAt(playerPos.x, 1.3, playerPos.z);

  if (playerDistance < 1.2) {
    health -= 28 * delta;
    if (health <= 0) {
      health = 0;
      endGame('lose');
    }
  }

  if (exitUnlocked && controls.getObject().position.distanceTo(exitDoor.position) < 1.8) {
    endGame('win');
    win = true;
  }

  setHealthText();
}

function animateRelics(time) {
  relics.forEach((relic, index) => {
    if (relic.userData.collected) return;
    relic.rotation.y = time * 0.001 + index * 1.8;
    relic.rotation.x = time * 0.0014;
    relic.position.y = relic.userData.baseY + Math.sin(time * 0.002 + index) * 0.26;
  });
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = Math.min(0.033, (now - (animate.lastTime || now)) / 1000);
  animate.lastTime = now;

  if (started && !gameOver) {
    movePlayer(delta);
    tryCollectRelic();
    updateEnemy(delta);
  }

  animateRelics(now);

  const pulse = 0.9 + Math.sin(now * 0.004) * 0.2;
  exitGlow.intensity = exitUnlocked ? 4 + pulse : 2.2;
  renderer.render(scene, camera);
}

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startButton.addEventListener('click', () => {
  started = true;
  startGame();
});

restartButton.addEventListener('click', () => {
  window.location.reload();
});

controls.addEventListener('lock', () => {
  startOverlay.classList.add('hidden');
});

controls.addEventListener('unlock', () => {
  if (started && !gameOver && !win) {
    startOverlay.classList.remove('hidden');
    startOverlay.querySelector('h1').textContent = 'Paused';
    startOverlay.querySelector('p').textContent = 'Click to continue exploring the basement.';
  }
});

controls.getObject().position.set(0, 1.7, 12);
setHealthText();
updateObjective();
animate();
