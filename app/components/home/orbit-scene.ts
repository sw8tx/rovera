import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export async function createOrbit(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.1, 9.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const group = new THREE.Group();
  scene.add(group);
  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync("/models/rovera-logo.glb");
  } catch (error) {
    environment.dispose();
    renderer.dispose();
    throw error;
  }
  const logo = gltf.scene.getObjectByName("HERO_rovera_mark");
  if (!logo) {
    environment.dispose();
    renderer.dispose();
    throw new Error("The Rovera logo mesh is missing from its 3D asset.");
  }
  const mark: THREE.Object3D = logo;
  group.add(mark);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdce5f2, 1.25);
  fill.position.set(4, -2, -3);
  scene.add(fill);
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  let progress = 0;
  let lastWidth = 0,
    lastHeight = 0;
  function render() {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    if (width !== lastWidth || height !== lastHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      lastWidth = width;
      lastHeight = height;
    }
    const turn = progress * Math.PI * 2;
    group.rotation.set(0.04 + Math.sin(turn) * 0.16, -0.18 + turn, Math.sin(turn) * 0.045);
    mark.position.y = Math.sin(turn) * 0.1;
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(render);
  observer.observe(host);
  render();
  return {
    update(value: number) {
      progress = value;
      render();
    },
    dispose() {
      observer.disconnect();
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
