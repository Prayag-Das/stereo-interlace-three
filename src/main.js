import * as THREE from "three";
// Import utilities for post-processing effects
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
// Loader for GLTF 3D models
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

class StereoInterlacer {
  /**
   * @param {THREE.Scene} scene - Three.js scene to render
   * @param {THREE.WebGLRenderer} renderer - Renderer instance
   */
  constructor(scene, renderer) {
    // Store references for later use
    this.scene = scene;
    this.renderer = renderer;

    // Create two perspective cameras for left and right eye
    this.leftCamera = new THREE.PerspectiveCamera(
        75, // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near clipping plane
        1000 // Far clipping plane
    );
    this.rightCamera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // Initial camera positions
    const initialLeftCamPos = new THREE.Vector3(-0.03, 10, 30);
    const initialRightCamPos = new THREE.Vector3(0.03, 10, 30);

    this.leftCamera.position.copy(initialLeftCamPos);
    this.rightCamera.position.copy(initialRightCamPos);

    // Group cameras so they move/rotate together
    this.cameraGroup = new THREE.Group();
    this.cameraGroup.add(this.leftCamera);
    this.cameraGroup.add(this.rightCamera);
    this.scene.add(this.cameraGroup);

    // Store initial camera group position and rotation state
    this.initialCameraGroupPosition = new THREE.Vector3().copy(this.cameraGroup.position);
    this.initialPitch = 0; // Initial X-axis rotation
    this.initialYaw = 0;   // Initial Y-axis rotation
    this.initialRoll = 0;  // Initial Z-axis rotation

    // Track current rotation angles for pitch (X), yaw (Y), and roll (Z)
    this.pitch = this.initialPitch;
    this.yaw = this.initialYaw;
    this.roll = this.initialRoll;

    // Flag to manage gimbal lock behavior for Euler angles
    // Set to true if you experience issues with rotations becoming locked
    // or prefer a specific Euler order. False uses Quaternions.
    this.gimbalLock = false;

    // Toggle for horizontal/vertical interlace
    this.isHorizontal = true;

    // Create off-screen render targets for each eye
    this.leftRenderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight
    );
    this.rightRenderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight
    );

    // Set up post-processing composer
    this.composer = new EffectComposer(renderer);
    // Define custom shader for interlacing two render targets
    this.cameraTintShader = {
      uniforms: {
        leftTexture: { value: this.leftRenderTarget.texture },
        rightTexture: { value: this.rightRenderTarget.texture },
        resolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        isHorizontal: { value: this.isHorizontal },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D leftTexture;
        uniform sampler2D rightTexture;
        uniform bool isHorizontal;
        varying vec2 vUv;

        void main() {
          // Choose coordinate: y for horizontal interlace, x for vertical
          float coord = isHorizontal ? gl_FragCoord.y : gl_FragCoord.x;
          // Determine line parity
          bool isEven = mod(floor(coord), 2.0) < 1.0;
          // Sample from left or right eye texture
          vec4 color = isEven ? texture2D(leftTexture, vUv) : texture2D(rightTexture, vUv);
          gl_FragColor = color;
        }
      `,
    };

    // Create a shader pass using our custom interlace shader
    this.tintPass = new ShaderPass(this.cameraTintShader);
    this.tintPass.renderToScreen = true;
    this.composer.addPass(this.tintPass);

    // Handle initial resize
    this.handleResize();
    // Update on window resize
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  /**
   * Switch between horizontal and vertical interlace
   */
  toggleInterlaceDirection() {
    this.isHorizontal = !this.isHorizontal;
    this.tintPass.uniforms.isHorizontal.value = this.isHorizontal;
  }

  /**
   * Update camera rotation based on pitch, yaw, and roll deltas.
   * This method now takes deltas for each axis.
   * @param {number} deltaX - Change in X-axis (affects yaw)
   * @param {number} deltaY - Change in Y-axis (affects pitch)
   * @param {number} deltaZ - Change in Z-axis (affects roll)
   */
  updateCameraRotation(deltaX, deltaY, deltaZ = 0) {
    this.yaw -= deltaX;   // Apply deltaX to yaw (e.g., from mouse movement in X)
    this.pitch -= deltaY; // Apply deltaY to pitch (e.g., from mouse movement in Y)
    this.roll += deltaZ;  // Apply deltaZ to roll (e.g., from keyboard Q/E)

    // Clamp pitch to avoid flipping upside down
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

    // Apply rotations
    if (this.gimbalLock) {
      this.cameraGroup.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    } else {
      const quaternion = new THREE.Quaternion();
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.roll);

      quaternion.multiplyQuaternions(yawQuat, pitchQuat);
      quaternion.multiplyQuaternions(quaternion, rollQuat);

      this.cameraGroup.setRotationFromQuaternion(quaternion);
    }
  }

  /**
   * Resets the camera to its initial position and rotation.
   */
  resetCamera() {
    // Reset position
    this.cameraGroup.position.copy(this.initialCameraGroupPosition);

    // Reset rotation angles
    this.pitch = this.initialPitch;
    this.yaw = this.initialYaw;
    this.roll = this.initialRoll;

    // Apply the reset rotation
    if (this.gimbalLock) {
      this.cameraGroup.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    } else {
      const quaternion = new THREE.Quaternion();
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.roll);

      quaternion.multiplyQuaternions(yawQuat, pitchQuat);
      quaternion.multiplyQuaternions(quaternion, rollQuat);
      this.cameraGroup.setRotationFromQuaternion(quaternion);
    }
  }

  /**
   * Render both eyes and composite with interlace shader
   */
  render() {
    // Render left eye
    this.renderer.setRenderTarget(this.leftRenderTarget);
    this.renderer.render(this.scene, this.leftCamera);
    // Render right eye
    this.renderer.setRenderTarget(this.rightRenderTarget);
    this.renderer.render(this.scene, this.rightCamera);
    // Back to default render target (screen)
    this.renderer.setRenderTarget(null);

    // Update shader textures and resolution
    this.tintPass.uniforms.leftTexture.value = this.leftRenderTarget.texture;
    this.tintPass.uniforms.rightTexture.value = this.rightRenderTarget.texture;
    this.tintPass.uniforms.resolution.value.set(
        window.innerWidth,
        window.innerHeight
    );

    // Run composer to apply shader
    this.composer.render();
  }

  /**
   * Adjust settings when the window size changes
   */
  handleResize() {
    const aspect = window.innerWidth / window.innerHeight;
    // Update camera aspect ratios and projection matrices
    [this.leftCamera, this.rightCamera].forEach((cam) => {
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
    });

    // Resize renderer and composer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.tintPass.uniforms.resolution.value.set(
        window.innerWidth,
        window.innerHeight
    );

    // Recreate render targets at new size
    this.leftRenderTarget.dispose();
    this.rightRenderTarget.dispose();
    this.leftRenderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight
    );
    this.rightRenderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight
    );
  }
}

// ---------- USAGE EXAMPLE ----------

// Create scene and renderer
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
// Use sRGB color space and ACES tone mapping for better visuals
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// Instantiate stereo interlacer
const stereo = new StereoInterlacer(scene, renderer);

// Load Milky Way skybox textures
const loader = new THREE.CubeTextureLoader();
const skyboxTexture = loader.load([
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nx.jpg",
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_ny.jpg",
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nz.jpg",
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_px.jpg",
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_py.jpg", // corrected order
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_pz.jpg",
]);
scene.background = skyboxTexture;

// Add ambient and directional (sun) lights
const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 10);
sunLight.position.set(5, 10, 7.5);
sunLight.castShadow = true;
scene.add(sunLight);

// Load a GLB model of the ISS
const gltfLoader = new GLTFLoader();
gltfLoader.load(
    "/models/ISS_stationary.glb",
    (gltf) => {
      scene.add(gltf.scene);
      gltf.scene.position.set(0, 0, 0);
    },
    undefined,
    (error) => {
      console.error("Error loading GLB model:", error);
    }
);

// Create a UI button to toggle interlace direction
const button = document.createElement("button");
button.innerText = "Toggle Interlace Mode";
button.style.position = "absolute";
button.style.top = "10px";
button.style.left = "10px";
button.style.zIndex = 1000;
document.body.appendChild(button);
button.addEventListener("click", () => stereo.toggleInterlaceDirection());

// Handle keyboard input for moving the camera
const keys = {};

// Handle keyboard input for resetting camera position
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyR') {
    stereo.resetCamera();
  }
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

// Variables for pointer lock and mouse movement
let isPointerLocked = false;
let mouseRotationSensitivity = 0.002;

// Request pointer lock on canvas click
renderer.domElement.addEventListener("click", () => {
  renderer.domElement.requestPointerLock();
});

// Event listener for pointer lock change
document.addEventListener("pointerlockchange", () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
});

// Mouse movement event listener
document.addEventListener("mousemove", (e) => {
  if (isPointerLocked) {
    const dx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    const dy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    stereo.updateCameraRotation(dx * mouseRotationSensitivity, dy * mouseRotationSensitivity, 0);
  }
});

// Function to translate camera group based on WASD + space/shift + F for speed + Q/E if rotation
function updateCameraControls() {
  const speed = 0.05;
  const rotationSpeed = 0.02;

  const direction = new THREE.Vector3();
  if (keys["KeyW"]) direction.z -= speed;
  if (keys["KeyW"] && keys["KeyF"]) direction.z -= speed * 5;
  if (keys["KeyS"]) direction.z += speed;
  if (keys["KeyS"] && keys["KeyF"]) direction.z += speed * 5;
  if (keys["KeyA"]) direction.x -= speed;
  if (keys["KeyA"] && keys["KeyF"]) direction.x -= speed * 5;
  if (keys["KeyD"]) direction.x += speed;
  if (keys["KeyD"] && keys["KeyF"]) direction.x += speed * 5;
  if (keys["Space"]) direction.y += speed;
  if (keys["Space"] && keys["KeyF"]) direction.y += speed * 5;
  if (keys["ShiftLeft"] || keys["ShiftRight"]) direction.y -= speed;
  if ((keys["ShiftLeft"] && keys["KeyF"]) || (keys["ShiftRight"] && keys["KeyF"])) direction.y -= speed * 4;

  if (keys["KeyQ"]) stereo.updateCameraRotation(0, 0, rotationSpeed);
  if (keys["KeyE"]) stereo.updateCameraRotation(0, 0, -rotationSpeed);

  if (keys["KeyZ"]) stereo.updateCameraRotation(rotationSpeed, 0, 0);
  if (keys["KeyC"]) stereo.updateCameraRotation(-rotationSpeed, 0, 0);

  stereo.cameraGroup.translateX(direction.x);
  stereo.cameraGroup.translateY(direction.y);
  stereo.cameraGroup.translateZ(direction.z);
}

// Main render loop
function animate() {
  requestAnimationFrame(animate);
  updateCameraControls();
  stereo.render();
}

animate();
