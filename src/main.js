import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Model Configuration - Add more models here
const PRELOADED_MODELS = [
  { name: "International Space Station", path: "/models/ISS_stationary.glb" },
  // Add more models by placing them in public/models/ and adding entries here
  // { name: "My Model", path: "/models/my_model.glb" },
];

class ModelSelector {
  constructor() {
    this.selectedModel = null;
    this.uploadedFile = null;
    this.onModelSelected = null;
    this.createUI();
  }

  createUI() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'model-selector-overlay';
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(10px);
      display: flex; justify-content: center; align-items: center; z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create container
    const container = document.createElement('div');
    container.style.cssText = `
      background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px; padding: 40px; max-width: 500px; width: 90%; text-align: center;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Select 3D Model';
    title.style.cssText = 'color: white; font-size: 28px; font-weight: 600; margin-bottom: 30px;';

    // Model list
    this.modelList = document.createElement('div');
    this.modelList.style.marginBottom = '30px';
    this.populateModelList();

    // Upload section
    const uploadSection = document.createElement('div');
    uploadSection.style.cssText = 'margin: 30px 0; padding: 20px 0; border-top: 1px solid rgba(255, 255, 255, 0.2);';

    const uploadLabel = document.createElement('label');
    uploadLabel.textContent = 'Or Upload Your Own Model';
    uploadLabel.style.cssText = 'color: rgba(255, 255, 255, 0.8); font-size: 18px; margin-bottom: 15px; display: block;';

    const fileWrapper = document.createElement('div');
    fileWrapper.style.cssText = `
      position: relative; display: inline-block; cursor: pointer;
      background: rgba(103, 126, 234, 0.6); border: 2px dashed rgba(255, 255, 255, 0.3);
      border-radius: 8px; padding: 20px 40px; transition: all 0.2s ease; margin-bottom: 20px;
    `;

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.glb,.gltf';
    this.fileInput.style.cssText = 'position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer;';

    const fileText = document.createElement('div');
    fileText.textContent = 'Click to browse files (.glb, .gltf)';
    fileText.style.cssText = 'color: white; font-size: 16px;';

    this.fileNameDisplay = document.createElement('div');
    this.fileNameDisplay.style.cssText = 'color: rgba(255, 255, 255, 0.8); font-size: 14px; margin-top: 10px; font-style: italic;';

    // Start button
    this.startButton = document.createElement('button');
    this.startButton.textContent = 'Start Experience';
    this.startButton.disabled = true;
    this.startButton.style.cssText = `
      background: linear-gradient(45deg, #667eea, #764ba2); border: none; color: white;
      padding: 15px 40px; font-size: 18px; font-weight: 600; border-radius: 50px;
      cursor: pointer; transition: all 0.2s ease; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    `;

    // Event listeners
    this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    this.startButton.addEventListener('click', () => this.startExperience());

    fileWrapper.addEventListener('mouseenter', () => {
      fileWrapper.style.background = 'rgba(103, 126, 234, 0.8)';
      fileWrapper.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    });
    fileWrapper.addEventListener('mouseleave', () => {
      fileWrapper.style.background = 'rgba(103, 126, 234, 0.6)';
      fileWrapper.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });

    // Assemble UI
    fileWrapper.appendChild(this.fileInput);
    fileWrapper.appendChild(fileText);
    uploadSection.appendChild(uploadLabel);
    uploadSection.appendChild(fileWrapper);
    uploadSection.appendChild(this.fileNameDisplay);

    container.appendChild(title);
    container.appendChild(this.modelList);
    container.appendChild(uploadSection);
    container.appendChild(this.startButton);

    this.overlay.appendChild(container);
    document.body.appendChild(this.overlay);
  }

  populateModelList() {
    this.modelList.innerHTML = '';

    PRELOADED_MODELS.forEach((model) => {
      const item = document.createElement('div');
      item.textContent = model.name;
      item.style.cssText = `
        background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px; padding: 15px; margin-bottom: 10px; cursor: pointer;
        transition: all 0.2s ease; color: white; font-size: 16px;
      `;

      item.addEventListener('click', () => this.selectModel(model, item));
      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(255, 255, 255, 0.2)';
        item.style.transform = 'translateY(-2px)';
      });
      item.addEventListener('mouseleave', () => {
        if (!item.classList.contains('selected')) {
          item.style.background = 'rgba(255, 255, 255, 0.1)';
          item.style.transform = 'translateY(0)';
        }
      });

      this.modelList.appendChild(item);
    });

    // Add info item for adding more models
    const infoItem = document.createElement('div');
    infoItem.textContent = 'Add more models to /public/models/';
    infoItem.style.cssText = `
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px; padding: 15px; margin-bottom: 10px; color: rgba(255, 255, 255, 0.5);
      font-size: 14px; font-style: italic; cursor: not-allowed;
    `;
    this.modelList.appendChild(infoItem);
  }

  selectModel(model, element) {
    // Clear previous selections
    this.modelList.querySelectorAll('div').forEach(item => {
      item.classList.remove('selected');
      item.style.background = 'rgba(255, 255, 255, 0.1)';
      item.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });

    // Select current
    element.classList.add('selected');
    element.style.background = 'rgba(103, 126, 234, 0.6)';
    element.style.borderColor = 'rgba(103, 126, 234, 0.8)';

    this.selectedModel = model;
    this.uploadedFile = null;
    this.fileNameDisplay.textContent = '';
    this.fileInput.value = '';
    this.updateStartButton();
  }

  handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
      this.uploadedFile = file;
      this.selectedModel = null;
      this.fileNameDisplay.textContent = `Selected: ${file.name}`;

      // Clear model selections
      this.modelList.querySelectorAll('div').forEach(item => {
        item.classList.remove('selected');
        item.style.background = 'rgba(255, 255, 255, 0.1)';
        item.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      });

      this.updateStartButton();
    }
  }

  updateStartButton() {
    const hasSelection = this.selectedModel || this.uploadedFile;
    this.startButton.disabled = !hasSelection;
    this.startButton.style.opacity = hasSelection ? '1' : '0.5';
    this.startButton.style.cursor = hasSelection ? 'pointer' : 'not-allowed';
  }

  startExperience() {
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';

    setTimeout(() => {
      this.overlay.remove();
      if (this.onModelSelected) {
        this.onModelSelected(this.selectedModel, this.uploadedFile);
      }
    }, 300);
  }

  show() {
    this.overlay.style.opacity = '1';
    this.overlay.style.pointerEvents = 'auto';
  }
}

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

class App {
  constructor() {
    this.scene = null;
    this.renderer = null;
    this.stereo = null;
    this.keys = {};
    this.isMouseDown = false;
    this.lastX = 0;
    this.lastY = 0;
    this.movementSpeed = 0.05; // Default speed value

    this.init();
  }

  init() {
    // Create and show model selector
    const modelSelector = new ModelSelector();
    modelSelector.onModelSelected = (selectedModel, uploadedFile) => {
      this.startThreeJS(selectedModel, uploadedFile);
    };
    modelSelector.show();
  }

  startThreeJS(selectedModel, uploadedFile) {
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(this.renderer.domElement);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Initialize stereo system
    this.stereo = new StereoInterlacer(this.scene, this.renderer);

    // Load skybox
    const loader = new THREE.CubeTextureLoader();
    const skyboxTexture = loader.load([
      "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nx.jpg",
      "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_ny.jpg",
      "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nz.jpg",
      "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_px.jpg",
      "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_py.jpg",
      "https://threejs.org/examples/textures/cube/MilkyWay/dark-s_pz.jpg",
    ]);
    this.scene.background = skyboxTexture;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 10);
    sunLight.position.set(5, 10, 7.5);
    sunLight.castShadow = true;
    this.scene.add(sunLight);

    // Load the selected model
    this.loadModel(selectedModel, uploadedFile);

    // Setup UI controls
    this.setupControls();

    // Start animation loop
    this.animate();
  }

  loadModel(selectedModel, uploadedFile) {
    const gltfLoader = new GLTFLoader();

    if (selectedModel && selectedModel.path) {
      // Load preloaded model
      gltfLoader.load(
          selectedModel.path,
          (gltf) => {
            this.scene.add(gltf.scene);
            gltf.scene.position.set(0, 0, 0);
            console.log(`Loaded model: ${selectedModel.name}`);
            this.showLoadingStatus(`Loaded: ${selectedModel.name}`, 'success');
          },
          (progress) => {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            this.showLoadingStatus(`Loading ${selectedModel.name}: ${percentage}%`);
          },
          (error) => {
            console.error("Error loading model:", error);
            this.showLoadingStatus(`Error loading ${selectedModel.name}`, 'error');
          }
      );
    } else if (uploadedFile) {
      // Load uploaded file
      const url = URL.createObjectURL(uploadedFile);
      gltfLoader.load(
          url,
          (gltf) => {
            this.scene.add(gltf.scene);
            gltf.scene.position.set(0, 0, 0);
            console.log(`Loaded uploaded model: ${uploadedFile.name}`);
            this.showLoadingStatus(`Loaded: ${uploadedFile.name}`, 'success');
            URL.revokeObjectURL(url);
          },
          (progress) => {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            this.showLoadingStatus(`Loading ${uploadedFile.name}: ${percentage}%`);
          },
          (error) => {
            console.error("Error loading uploaded model:", error);
            this.showLoadingStatus(`Error loading ${uploadedFile.name}`, 'error');
            URL.revokeObjectURL(url);
          }
      );
    }
  }

  showLoadingStatus(message, type = 'info') {
    // Remove existing status if present
    const existingStatus = document.getElementById('loading-status');
    if (existingStatus) existingStatus.remove();

    const status = document.createElement('div');
    status.id = 'loading-status';
    status.textContent = message;
    status.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 1001;
      background: ${type === 'error' ? 'rgba(220, 38, 38, 0.9)' : type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
      color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); backdrop-filter: blur(10px);
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(status);

    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        status.style.opacity = '0';
        setTimeout(() => status.remove(), 300);
      }, 3000);
    }
  }

  setupControls() {
    // Create toggle button
    const button = document.createElement("button");
    button.innerText = "Toggle Interlace Mode";
    button.style.cssText = `
      position: absolute; top: 10px; left: 10px; z-index: 1000;
      background: rgba(103, 126, 234, 0.8); border: none; color: white;
      padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px;
      font-weight: 500; transition: background 0.2s ease;
    `;
    button.addEventListener('mouseenter', () => button.style.background = 'rgba(103, 126, 234, 1)');
    button.addEventListener('mouseleave', () => button.style.background = 'rgba(103, 126, 234, 0.8)');
    document.body.appendChild(button);
    button.addEventListener("click", () => this.stereo.toggleInterlaceDirection());

    // Create speed control slider
    const speedContainer = document.createElement('div');
    speedContainer.style.cssText = `
      position: absolute; top: 60px; left: 10px; z-index: 1000;
      background: rgba(0, 0, 0, 0.7); border-radius: 6px; padding: 15px;
      backdrop-filter: blur(10px); min-width: 200px;
    `;

    const speedLabel = document.createElement('label');
    speedLabel.textContent = 'Movement Speed';
    speedLabel.style.cssText = `
      display: block; color: white; font-size: 12px; font-weight: 500;
      margin-bottom: 8px;
    `;

    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0.01';
    speedSlider.max = '0.2';
    speedSlider.step = '0.01';
    speedSlider.value = this.movementSpeed.toString();
    speedSlider.id = 'speed-slider';
    speedSlider.style.cssText = `
      width: 100%; height: 20px; background: rgba(255, 255, 255, 0.2);
      border-radius: 10px; outline: none; cursor: pointer;
      -webkit-appearance: none; appearance: none;
    `;

    // Add custom slider styling
    const style = document.createElement('style');
    style.textContent = `
      #speed-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #667eea;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }
      #speed-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #667eea;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }
    `;
    document.head.appendChild(style);

    const speedValue = document.createElement('span');
    speedValue.textContent = `${Math.round(this.movementSpeed / 0.05 * 100)}%`;
    speedValue.style.cssText = `
      color: rgba(255, 255, 255, 0.8); font-size: 11px; float: right;
      margin-top: 5px; display: block;
    `;

    // Use both 'input' and 'change' events for better compatibility
    const updateSpeed = (e) => {
      const newSpeed = parseFloat(e.target.value);
      console.log('Slider event fired! Old speed:', this.movementSpeed, 'New speed:', newSpeed);
      this.movementSpeed = newSpeed;
      speedValue.textContent = `${Math.round(newSpeed / 0.05 * 100)}%`;
      console.log('Speed updated to:', this.movementSpeed);
    };

    speedSlider.addEventListener('input', updateSpeed);
    speedSlider.addEventListener('change', updateSpeed);

    // Test the slider is working by adding a click test
    speedSlider.addEventListener('mousedown', () => {
      console.log('Slider clicked, current value:', speedSlider.value);
    });

    speedContainer.appendChild(speedLabel);
    speedContainer.appendChild(speedSlider);
    speedContainer.appendChild(speedValue);
    document.body.appendChild(speedContainer);

    // Create controls info panel
    const controlsInfo = document.createElement('div');
    controlsInfo.style.cssText = `
      position: fixed; top: 140px; left: 10px; background: rgba(0, 0, 0, 0.7);
      color: white; padding: 15px; border-radius: 8px; font-size: 12px;
      z-index: 1001; backdrop-filter: blur(10px); max-width: 250px;
    `;
    controlsInfo.innerHTML = `
      <strong>Controls:</strong><br>
      WASD - Move around<br>
      Space/Shift - Up/Down<br>
      F + Movement - Fast mode (5x)<br>
      Mouse drag - Look around<br>
      Q/E - Roll camera<br>
      Z/C - Pitch adjust<br>
      R - Reset camera
    `;
    document.body.appendChild(controlsInfo);

    // Keyboard event handlers
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.stereo.resetCamera();
    });
    window.addEventListener("keyup", (e) => (this.keys[e.code] = false));

    // Mouse event handlers
    this.renderer.domElement.addEventListener("mousedown", (e) => {
      this.isMouseDown = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    this.renderer.domElement.addEventListener("mouseup", () => {
      this.isMouseDown = false;
    });

    this.renderer.domElement.addEventListener("mousemove", (e) => {
      if (this.isMouseDown) {
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.stereo.updateCameraRotation(dx * 0.002, dy * 0.002);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
  }

  updateCameraControls() {
    const speed = 0.05;
    const rotationSpeed = 0.02;
    const dir = new THREE.Vector3();

    if (this.keys["KeyW"]) dir.z -= speed;
    if (this.keys["KeyW"] && this.keys["KeyF"]) dir.z -= speed * 5;
    if (this.keys["KeyS"]) dir.z += speed;
    if (this.keys["KeyS"] && this.keys["KeyF"]) dir.z += speed * 5;
    if (this.keys["KeyA"]) dir.x -= speed;
    if (this.keys["KeyA"] && this.keys["KeyF"]) dir.x -= speed * 5;
    if (this.keys["KeyD"]) dir.x += speed;
    if (this.keys["KeyD"] && this.keys["KeyF"]) dir.x += speed * 5;
    if (this.keys["Space"]) dir.y += speed;
    if (this.keys["Space"] && this.keys["KeyF"]) dir.y += speed * 5;
    if (this.keys["ShiftLeft"] || this.keys["ShiftRight"]) dir.y -= speed;
    if ((this.keys["ShiftLeft"] && this.keys["KeyF"]) || (this.keys["ShiftRight"] && this.keys["KeyF"])) dir.y -= speed * 4;

    if (this.keys["KeyQ"]) this.stereo.updateCameraRotation(0, 0, rotationSpeed);
    if (this.keys["KeyE"]) this.stereo.updateCameraRotation(0, 0, -rotationSpeed);
    if (this.keys["KeyZ"]) this.stereo.updateCameraRotation(rotationSpeed, 0, 0);
    if (this.keys["KeyC"]) this.stereo.updateCameraRotation(-rotationSpeed, 0, 0);

    this.stereo.cameraGroup.translateX(dir.x);
    this.stereo.cameraGroup.translateY(dir.y);
    this.stereo.cameraGroup.translateZ(dir.z);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.updateCameraControls();
    this.stereo.render();
  }
}

// Start the application
new App();