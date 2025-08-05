import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

class StereoInterlacer {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.leftCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.rightCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.leftCamera.position.set(-0.03, 10, 30);
    this.rightCamera.position.set(0.03, 10, 30);

    this.cameraGroup = new THREE.Group();
    this.cameraGroup.add(this.leftCamera);
    this.cameraGroup.add(this.rightCamera);
    this.scene.add(this.cameraGroup);

    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;

    this.initialPitch = 0;
    this.initialYaw = 0;
    this.initialRoll = 0;
    this.initialCameraGroupPosition = new THREE.Vector3().copy(this.cameraGroup.position);

    this.isHorizontal = true;

    this.leftRenderTarget = new THREE.WebGLRenderTarget(1, 1);
    this.rightRenderTarget = new THREE.WebGLRenderTarget(1, 1);

    this.composer = new EffectComposer(this.renderer);

    this.cameraTintShader = {
      uniforms: {
        leftTexture: { value: null },
        rightTexture: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) },
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
        uniform bool    isHorizontal;
        uniform vec2    resolution;
        varying vec2    vUv;

        void main() {
          float index = isHorizontal
            ? floor(vUv.y * resolution.y)
            : floor(vUv.x * resolution.x);

          bool isEven = mod(index, 2.0) < 1.0;
          vec4 color = isEven
            ? texture2D(leftTexture,  vUv)
            : texture2D(rightTexture, vUv);

          gl_FragColor = color;
        }
      `,
    };

    this.tintPass = new ShaderPass(this.cameraTintShader);
    this.tintPass.renderToScreen = true;
    this.composer.addPass(this.tintPass);

    this.handleResize();
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  toggleInterlaceDirection() {
    this.isHorizontal = !this.isHorizontal;
    this.tintPass.uniforms.isHorizontal.value = this.isHorizontal;
  }

  updateCameraRotation(deltaX, deltaY, deltaZ = 0) {
    this.yaw -= deltaX;
    this.pitch -= deltaY;
    this.roll += deltaZ;

    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

    const quaternion = new THREE.Quaternion();
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.roll);

    quaternion.multiplyQuaternions(yawQuat, pitchQuat);
    quaternion.multiplyQuaternions(quaternion, rollQuat);
    this.cameraGroup.setRotationFromQuaternion(quaternion);
  }

  resetCamera() {
    this.cameraGroup.position.copy(this.initialCameraGroupPosition);
    this.pitch = this.initialPitch;
    this.yaw = this.initialYaw;
    this.roll = this.initialRoll;

    const quaternion = new THREE.Quaternion();
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.roll);

    quaternion.multiplyQuaternions(yawQuat, pitchQuat);
    quaternion.multiplyQuaternions(quaternion, rollQuat);
    this.cameraGroup.setRotationFromQuaternion(quaternion);
  }

  render() {
    this.renderer.setRenderTarget(this.leftRenderTarget);
    this.renderer.render(this.scene, this.leftCamera);

    this.renderer.setRenderTarget(this.rightRenderTarget);
    this.renderer.render(this.scene, this.rightCamera);

    this.renderer.setRenderTarget(null);

    this.tintPass.uniforms.leftTexture.value = this.leftRenderTarget.texture;
    this.tintPass.uniforms.rightTexture.value = this.rightRenderTarget.texture;

    this.composer.render();
  }

  handleResize() {
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const pixelRatio = this.renderer.getPixelRatio();
    const realWidth = Math.floor(window.innerWidth * pixelRatio);
    const realHeight = Math.floor(window.innerHeight * pixelRatio);

    const aspect = window.innerWidth / window.innerHeight;
    [this.leftCamera, this.rightCamera].forEach((cam) => {
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(realWidth, realHeight);

    this.leftRenderTarget.dispose();
    this.rightRenderTarget.dispose();
    this.leftRenderTarget = new THREE.WebGLRenderTarget(realWidth, realHeight);
    this.rightRenderTarget = new THREE.WebGLRenderTarget(realWidth, realHeight);

    this.tintPass.uniforms.resolution.value.set(realWidth, realHeight);
  }
}

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
renderer.setPixelRatio(window.devicePixelRatio);

const stereo = new StereoInterlacer(scene, renderer);

const loader = new THREE.CubeTextureLoader();
const skyboxTexture = loader.load([
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nx.jpg",
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_ny.jpg",
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nz.jpg",
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_px.jpg",
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_py.jpg",
  "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_pz.jpg",
]);
scene.background = skyboxTexture;

const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 10);
sunLight.position.set(5, 10, 7.5);
sunLight.castShadow = true;
scene.add(sunLight);

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

const button = document.createElement("button");
button.innerText = "Toggle Interlace Mode";
button.style.position = "absolute";
button.style.top = "10px";
button.style.left = "10px";
button.style.zIndex = 1000;
document.body.appendChild(button);
button.addEventListener("click", () => stereo.toggleInterlaceDirection());

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyR') stereo.resetCamera();
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

let isMouseDown = false;
let lastX = 0;
let lastY = 0;

renderer.domElement.addEventListener("mousedown", (e) => {
  isMouseDown = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
renderer.domElement.addEventListener("mouseup", () => {
  isMouseDown = false;
});
renderer.domElement.addEventListener("mousemove", (e) => {
  if (isMouseDown) {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    stereo.updateCameraRotation(dx * 0.002, dy * 0.002);
    lastX = e.clientX;
    lastY = e.clientY;
  }
});

function updateCameraControls() {
  const speed = 0.05;
  const rotationSpeed = 0.02;
  const dir = new THREE.Vector3();

  if (keys["KeyW"]) dir.z -= speed;
  if (keys["KeyW"] && keys["KeyF"]) dir.z -= speed * 5;
  if (keys["KeyS"]) dir.z += speed;
  if (keys["KeyS"] && keys["KeyF"]) dir.z += speed * 5;
  if (keys["KeyA"]) dir.x -= speed;
  if (keys["KeyA"] && keys["KeyF"]) dir.x -= speed * 5;
  if (keys["KeyD"]) dir.x += speed;
  if (keys["KeyD"] && keys["KeyF"]) dir.x += speed * 5;
  if (keys["Space"]) dir.y += speed;
  if (keys["Space"] && keys["KeyF"]) dir.y += speed * 5;
  if (keys["ShiftLeft"] || keys["ShiftRight"]) dir.y -= speed;
  if ((keys["ShiftLeft"] && keys["KeyF"]) || (keys["ShiftRight"] && keys["KeyF"])) dir.y -= speed * 4;

  if (keys["KeyQ"]) stereo.updateCameraRotation(0, 0, rotationSpeed);
  if (keys["KeyE"]) stereo.updateCameraRotation(0, 0, -rotationSpeed);
  if (keys["KeyZ"]) stereo.updateCameraRotation(rotationSpeed, 0, 0);
  if (keys["KeyC"]) stereo.updateCameraRotation(-rotationSpeed, 0, 0);

  stereo.cameraGroup.translateX(dir.x);
  stereo.cameraGroup.translateY(dir.y);
  stereo.cameraGroup.translateZ(dir.z);
}

function animate() {
  requestAnimationFrame(animate);
  updateCameraControls();
  stereo.render();
}

animate();
