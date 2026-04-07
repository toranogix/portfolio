
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {texturesPaths, cameraPosition, cameraTarget, socialLinks, params} from '../public/constants/constants.js'
import gui from '../public/debug/debug.js'
import {hoverEffect, loadVideoTexture} from '../public/helper/helper.js'
import smokeVertexShader from "../public/shaders/smoke/vertex.glsl?raw";
import smokeFragmentShader from "../public/shaders/smoke/fragment.glsl?raw";
import { time } from 'three/tsl';


let minCameraY = null;
const texturesMap = {}
let objectsToIntersect = []
let currentIntersects = null
let currentHoveredObject = null
let gisLetters = []
let gamingChairTop = null
let vinylDisk = null
const gisLetterAnim = { peak: 0.2, periodSec: 3.5, staggerSec: 0.35 }
let ball = null


// load video and display to screen
const desktopScreenVideoTexture = loadVideoTexture(params.videoTexturePath, 0.25, -0.135);
const masScreenVideoTexture = loadVideoTexture(params.videoTexturePath, 0, 0);

/* scene*/
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

/* camera*/
const camera = new THREE.PerspectiveCamera(35, params.aspect, 0.1, 100)
camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
scene.add(camera)
const state = gui(camera, scene)

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
const touch = new THREE.Vector2()
window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX / params.width * 2 - 1,
    mouse.y = - (event.clientY / params.height) * 2 + 1
})
window.addEventListener('touchmove', (event) => {
    touch.x = event.clientX / params.width * 2 - 1,
    touch.y = - (event.clientY / params.height) * 2 + 1
})
window.addEventListener('click', () => {
    if(currentIntersects && currentIntersects.length > 0){
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
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 10;
controls.minAzimuthAngle = Math.PI * 0.5;
controls.maxAzimuthAngle = - Math.PI;
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

const bedCover = textureLoader.load("/textures/bed_cover.webp")
bedCover.flipY = false
bedCover.colorSpace = THREE.SRGBColorSpace

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
                }
                // list letters to animate
                if(child.name.includes("gis_letter")){
                    child.userData.initialPosition = new THREE.Vector3().copy(child.position)
                    gisLetters.push(child)
                }
                if(child.name.includes("hover") || child.name.includes("wall") || child.name.includes("target")
                    || child.name.includes("paper")){
                    child.userData.initialScale = new THREE.Vector3().copy(child.scale)
                    child.userData.initialPosition = new THREE.Vector3().copy(child.position)
                    child.userData.initialRotation = new THREE.Vector3().copy(child.rotation)
                    child.userData.isAnimating = false
                }
                
                if(child.name.includes("bed_cover")){
                    child.material = new THREE.MeshBasicMaterial({map: bedCover})
                    child.material.needsUpdate = true
                }
        
                if(child.name.includes("gaming_chair_head_rotate")){
                    gamingChairTop = child
                    child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
                }
                if(child.name.includes("vinyl_disk")){
                    vinylDisk = child
                    child.userData.initialPosition = new THREE.Euler().copy(child.position);
                    child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
                }
                // give a material to threejs_logo
                if(child.name.includes("threejs")){
                    const threejsMaterial = new THREE.MeshBasicMaterial({color: "#ffffff"});
                    child.material = threejsMaterial;
                    child.material.needsUpdate = true;
                }
                if(child.name.includes("gis")){
                    const gisMaterial = new THREE.MeshStandardMaterial({emissive: "#FF9536",emissiveIntensity: 1});
                    child.material = gisMaterial
                    child.material.needsUpdate = true
                }
                if(child.name.includes("gis_base")){
                    const gisMaterialBase = new THREE.MeshStandardMaterial({color: "#582f0e"});
                    child.material = gisMaterialBase
                    child.material.needsUpdate = true
                }
                if(child.name.includes("lis")){
                    const lisMaterial = new THREE.MeshStandardMaterial({emissive: "#FFB3F3",emissiveIntensity: 1});
                    child.material = lisMaterial
                    child.material.needsUpdate = true
                }
                if(child.name.includes("ball")){
                    ball = child
                    child.userData.initialPosition = new THREE.Vector3().copy(child.position)
                    child.userData.isAnimating = false
                }

                // video material
                if (child.name.includes("desktop_screen")){
                    const videoMaterial = new THREE.MeshBasicMaterial({map: desktopScreenVideoTexture})
                    child.material = videoMaterial;
                }
                if (child.name.includes("mac_screen")){
                    const videoMaterial = new THREE.MeshBasicMaterial({
                        map: masScreenVideoTexture
                    })
                    child.material = videoMaterial;
                }
            }
        });
        glb.scene.scale.setScalar(0.08)
        scene.add(glb.scene);
        gisLetters.sort((a, b) => a.name.localeCompare(b.name))

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


// coffe mug => add smoke
const smokeGeometry = new THREE.PlaneGeometry(1, 1, 16, 64)
smokeGeometry.translate(0, 0.5, 0)
smokeGeometry.scale(0.03, 0.1, 0.03)
const perlinTexture = textureLoader.load("/textures/perlin.png");
perlinTexture.wrapS = THREE.RepeatWrapping;
perlinTexture.wrapT = THREE.RepeatWrapping;


const smokeMaterial = new THREE.ShaderMaterial({
    vertexShader: smokeVertexShader,
    fragmentShader: smokeFragmentShader,
    uniforms: {
      uTime: new THREE.Uniform(0),
      uPerlinTexture: new THREE.Uniform(perlinTexture),
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });

const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial)
smoke.position.set(-0.119, 1.90, 0.01)
scene.add(smoke)



const clock = new THREE.Clock()

/* animate*/
function animate(timestamps) {

    const elapsedTime = clock.getElapsedTime()
    window.requestAnimationFrame(animate)
    controls.update()

    // update smoke
    smokeMaterial.uniforms.uTime.value = elapsedTime

    // clamp the camera position to the minimum camera y
    if (minCameraY !== null && camera.position.y < minCameraY) {
        camera.position.y = minCameraY;
        controls.target.y = Math.max(controls.target.y, minCameraY);
    }

    // rotate gaming chair and vinyl disk
    if(gamingChairTop){
        const time = timestamps *  0.001
        const baseAmplitude = Math.PI / 5
        const rotationOffset = baseAmplitude * Math.sin(time * 0.5) * (1 - Math.abs(Math.sin(time * 0.5)) * 0.3);
        gamingChairTop.rotation.y = gamingChairTop.userData.initialRotation.y + rotationOffset;
    }
    if(state.isPlaying && vinylDisk){
        const time = timestamps * 0.0015
        vinylDisk.rotation.y = vinylDisk.userData.initialRotation.y + time
    }

    // move ball up and down
    if(ball){
        const time = timestamps * 0.002
        ball.position.y = 0.4 + ball.userData.initialPosition.y + 0.5 * Math.sin(time)
    }

    // animate gis letters
    const { peak, periodSec, staggerSec } = gisLetterAnim
    const omega = (2 * Math.PI) / periodSec
    gisLetters.forEach((letter, index) => {
        const y0 = letter.userData.initialPosition.y
        const phase = index * staggerSec * omega
        const w = 0.5 + 0.5 * Math.sin(elapsedTime * omega + phase)
        letter.position.y = y0 + peak * w
    })
    
    // raycaster elements
    raycaster.setFromCamera(mouse, camera)
    currentIntersects = raycaster.intersectObjects(objectsToIntersect)
    if(currentIntersects && currentIntersects.length > 0){

        // hover effect for the intersected object
        const currentIntersectedObject = currentIntersects[0].object
        if(currentIntersectedObject !== currentHoveredObject){
            if(currentHoveredObject){
                hoverEffect(currentHoveredObject, false, 1, smoke)
            }
            currentHoveredObject = currentIntersectedObject
            hoverEffect(currentHoveredObject, true, 1.3, smoke)
        }
    } else {
        if(currentHoveredObject){
            hoverEffect(currentHoveredObject, false, 1, smoke)
            currentHoveredObject = null
        }
    }
        renderer.render(scene, camera)
    }

animate()
