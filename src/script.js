
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {texturesPaths, cameraPosition, cameraTarget, socialLinks, params} from '../public/constants/constants.js'
import gui from '../public/debug/debug.js'
// import {hoverEffect} from '../public/helper/helper.js'


// debug panel
gui()

// variables
let minCameraY = null;
let soundListener = null
let soundTrack = null
const texturesMap = {}
let objectsToIntersect = []
let currentIntersects = null
let currentHoveredObject = null
let currentHoveredWallObject = null


// load video and display to screen
const video = document.createElement('video')
video.src = "/video/game.mp4"
video.loop = true
video.muted = true
video.playsInline = true
video.autoplay = true
video.play()
const videoTexture = new THREE.VideoTexture(video)
// videoTexture.flipY = true
videoTexture.colorSpace = THREE.SRGBColorSpace;
videoTexture.repeat.set(1, 1.5)
videoTexture.offset.set(0, 0)


/* scene*/
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

/* camera*/
const camera = new THREE.PerspectiveCamera(35, params.aspect, 0.1, 100)
camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
scene.add(camera)

/* lights*/
const ambientLight = new THREE.AmbientLight(0xffffff, 6);
scene.add(ambientLight);


/* renderer*/
const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true})
renderer.setSize(params.width, params.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/* resize */
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
})

/* raycaster + get mouse mouvement */
const raycaster = new THREE.Raycaster()

const mouse = new THREE.Vector2()
window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX / params.width * 2 - 1,
    mouse.y = - (event.clientY / params.height) * 2 + 1
})
window.addEventListener('click', () => {
    if(currentIntersects.length > 0){
        const object = currentIntersects[0].object
        Object.entries(socialLinks).forEach(([key, url]) => {
            if(object.name.includes(key)){
                const newWindow = window.open()
                newWindow.opener = null
                newWindow.location = url
                newWindow.target = "_blank"
                newWindow.rel = "noopener noreferrer"

            }
        })
    }
})


/* controls */
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
// controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 10;
controls.minPolarAngle = Math.PI * 0.2;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(cameraTarget.x, cameraTarget.y, cameraTarget.z)

/* textures map + loader */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')
dracoLoader.preload()
const textureLoader = new THREE.TextureLoader();
Object.entries(texturesPaths).forEach(([key, path]) => {
    textureLoader.load(path, (texture) => {
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
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

                // list objects to intersect
                if(child.name.includes("target")){
                    objectsToIntersect.push(child)

                    // for hover effect
                    child.userData.initialScale = new THREE.Vector3().copy(child.scale)
                    child.userData.initialPosition = new THREE.Vector3().copy(child.position)
                    child.userData.initialRotation = new THREE.Vector3().copy(child.rotation)
                    child.userData.isAnimating = false
                }

                // give a material to threejs_logo
                if(child.name.includes("threejs")){
                    const threejsMaterial = new THREE.MeshBasicMaterial({color: "#ffffff"});
                    child.material = threejsMaterial;
                    child.material.needsUpdate = true;
                }

                // video material
                if (child.name.includes("screen")){
                    const videoMaterial = new THREE.MeshBasicMaterial({map: videoTexture})
                    child.material = videoMaterial;
                    // child.material.needsUpdate = true;
                }
            }
        });
        glb.scene.scale.setScalar(0.08)
        console.log(glb.scene)
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
    
    // raycaster elements
    raycaster.setFromCamera(mouse, camera)
    currentIntersects = raycaster.intersectObjects(objectsToIntersect)
    for(const intersect of currentIntersects){
    }

    renderer.render(scene, camera)
}
animate()
