import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {params} from '../utils/utils.js'
import {texturesPaths} from '../public/constants/constants.js'



/* scene*/
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

/* camera*/
const camera = new THREE.PerspectiveCamera(75, params.aspect, 0.1, 100)
camera.position.set(2, 5, -5)
scene.add(camera)

/* lights*/
// const pointLight = new THREE.PointLight(0xffffff, 6);
// pointLight.position.set(0, 3, 0.5);
// pointLight.castShadow = true;
// scene.add(pointLight);

// const spotLight = new THREE.SpotLight("#E0570D", );
// spotLight.position.set(0, 8, 1);
// spotLight.castShadow = true;
// scene.add(spotLight);
const ambientLight = new THREE.AmbientLight(0xffffff, 6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
directionalLight.position.set(0, 10, 0);
directionalLight.castShadow = true;
scene.add(directionalLight);

/* renderer*/
const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true})
renderer.setSize(params.width, params.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/* controls */
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enablePan = false;
controls.minDistance = 1.5;
controls.maxDistance = 5;
controls.minPolarAngle = Math.PI * 0.2;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 1, 0)

let minCameraY = null;

/* textures map */
const texturesMap = {};

/* loader + texture loader */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')
dracoLoader.preload()

const textureLoader = new THREE.TextureLoader();
Object.entries(texturesPaths).forEach(([key, path]) => {
    textureLoader.load(path, (texture) => {
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.encoding = THREE.sRGBEncoding;
        texturesMap[key] = texture;
    });
});

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.load("/model/room_portfolio.glb", (glb) => {
    glb.scene.traverse((child) => {
        if(child.isMesh){
            Object.keys(texturesMap).forEach((key) => {
                if(child.name.includes(key)){
                    const material = new THREE.MeshBasicMaterial({map: texturesMap[key]});
                    child.material = material;
                    child.material.needsUpdate = true;
                }
                });
            }
        });
        console.log(glb.scene);
        glb.scene.scale.setScalar(0.08)
        scene.add(glb.scene);

        // calculate the limit of the camera using the bounding box of the scene
        // without the background   
        const bbox = new THREE.Box3().makeEmpty();
        glb.scene.updateWorldMatrix(true, true);
        glb.scene.traverse((obj) => {
            if (!obj.isMesh) return;
            const name = (obj.name || "").toLowerCase();
            if (name.includes("background")) return;
            const objBox = new THREE.Box3().setFromObject(obj);
            bbox.union(objBox);
        });
        if (!bbox.isEmpty()) {
            const floorY = bbox.min.y;
            const margin = 0.05;
            minCameraY = floorY + margin;
            controls.target.y = Math.max(controls.target.y, minCameraY);
        }
    });


/* animate*/
function animate() {
    window.requestAnimationFrame(animate)
    controls.update()

    // clamp the camera position to the minimum camera y
    if (minCameraY !== null && camera.position.y < minCameraY) {
        camera.position.y = minCameraY;
        controls.target.y = Math.max(controls.target.y, minCameraY);
    }
    renderer.render(scene, camera)
}
animate()