
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import {texturesPaths, cameraPosition, cameraTarget, socialLinks, passionInfo, params, desktopUrl} from '../public/constants/constants.js'
import gui from '../public/debug/debug.js'
import { createAudioManager } from '../public/audio/audioManager.js'
import { initMusicButton } from '../public/audio/musicButton.js'
import { initSplash } from '../public/splash/splash.js'
import { initPassionPanel } from '../public/passion/passionPanel.js'
import {hoverEffect, loadVideoTexture, ensureHoverUserData} from '../public/helper/helper.js'
import smokeVertexShader from "../public/shaders/smoke/vertex.glsl?raw";
import smokeFragmentShader from "../public/shaders/smoke/fragment.glsl?raw";
import { time } from 'three/tsl';
import gsap from 'gsap'


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

const DESKTOP_IFRAME_WIDTH = 1280
const DESKTOP_IFRAME_HEIGHT = 720
const DESKTOP_FOCUS_DISTANCE = 0.25
let desktopScreenMesh = null
let desktopHitbox = null
let desktopFocus = null
let isDesktopFocused = false
let isCameraAnimating = false

const savedControlsLimits = {
    minDistance: 3,
    maxDistance: 4,
    minAzimuthAngle: Math.PI * 0.5,
    maxAzimuthAngle: -Math.PI,
    minPolarAngle: Math.PI * 0.2,
    maxPolarAngle: Math.PI * 0.49,
}

// load video and display to screen mac
const macScreenVideoTexture = loadVideoTexture(params.videoTexturePath, 0, 0);

/* scene*/
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const cssScene = new THREE.Scene()

/* camera*/
const camera = new THREE.PerspectiveCamera(35, params.aspect, 0.1, 100)
camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
scene.add(camera)
const audioManager = createAudioManager(camera, scene)
const musicButton = initMusicButton(audioManager)
const passionPanel = initPassionPanel()
const state = gui(audioManager, () => musicButton?.sync())
const passionKeys = Object.keys(passionInfo)

function getPassionEntry(objectName) {
    const key = passionKeys.find((passionKey) => objectName.includes(passionKey))
    return key ? passionInfo[key] : null
}

function isPassionObject(objectName) {
    return passionKeys.some((passionKey) => objectName.includes(passionKey))
}

/** Clickable passion props that should not scale on hover. */
function skipsHoverEffect(objectName) {
    return objectName.includes('gis_letter')
        || objectName.includes('lis')
        || objectName.includes('earth_globe')
        || objectName.includes('naruto_headband')
        || objectName.includes('threejs')
        || objectName.includes('desktop_screen_hitbox')
}

function isDesktopHitbox(object) {
    return Boolean(object?.userData?.isDesktopHitbox)
}

// init splash screen, wait for all assets before revealing the scene
initSplash(async (withSound) => {
    await assetsReadyPromise;
    musicButton?.show()
    if (withSound) await audioManager.play()
    musicButton?.sync()
})

/* lights*/
const ambientLight = new THREE.AmbientLight(0xffffff, 6);
// layer 0 = room, layer 1 = occluder pass (chair over the iframe)
ambientLight.layers.enable(1)
scene.add(ambientLight);


/* renderers
 * Layer stack: WebGL room → CSS3D iframe on screen → WebGL occluder (chair only)
 */
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
renderer.setSize(params.width, params.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const cssRenderer = new CSS3DRenderer()
cssRenderer.setSize(params.width, params.height)
cssRenderer.domElement.classList.add('css3d')
document.body.appendChild(cssRenderer.domElement)

const occluderCanvas = document.createElement('canvas')
occluderCanvas.className = 'webgl-occluder'
document.body.appendChild(occluderCanvas)
const occluderRenderer = new THREE.WebGLRenderer({ canvas: occluderCanvas, antialias: false, alpha: true })
occluderRenderer.setClearColor(0x000000, 0)
occluderRenderer.setSize(params.width, params.height)
occluderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Place a live iframe on the desktop_screen mesh via CSS3D .
 * @param {THREE.Mesh} mesh
 */
function mountDesktopCss3D(mesh) {
    desktopScreenMesh = mesh

    const iframe = document.createElement('iframe')
    iframe.src = desktopUrl
    iframe.title = 'Roomangix OS'
    iframe.loading = 'lazy'
    iframe.referrerPolicy = 'no-referrer'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.tabIndex = -1
    iframe.style.width = `${DESKTOP_IFRAME_WIDTH}px`
    iframe.style.height = `${DESKTOP_IFRAME_HEIGHT}px`

    const cssObject = new CSS3DObject(iframe)

    mesh.updateWorldMatrix(true, false)
    mesh.geometry.computeBoundingBox()
    const bb = mesh.geometry.boundingBox
    const localSize = bb.getSize(new THREE.Vector3())
    const localCenter = bb.getCenter(new THREE.Vector3())
    const worldScale = mesh.getWorldScale(new THREE.Vector3())
    const size = localSize.clone().multiply(worldScale)

    const axes = [
        { axis: 'x', value: size.x },
        { axis: 'y', value: size.y },
        { axis: 'z', value: size.z },
    ].sort((a, b) => a.value - b.value)
    const depth = axes[0]

    const center = localCenter.clone()
    mesh.localToWorld(center)

    const worldQuat = mesh.getWorldQuaternion(new THREE.Quaternion())
    cssObject.quaternion.copy(worldQuat)
    cssObject.position.copy(center)

    let screenW
    let screenH
    if (depth.axis === 'z') {
        screenW = size.x
        screenH = size.y
    } else if (depth.axis === 'x') {
        cssObject.rotateY(Math.PI / 2)
        screenW = size.z
        screenH = size.y
    } else {
        cssObject.rotateX(-Math.PI / 2)
        screenW = size.x
        screenH = size.z
    }

    cssObject.scale.set(screenW / DESKTOP_IFRAME_WIDTH, screenH / DESKTOP_IFRAME_HEIGHT, 1)

    // Sit on the front face (toward camera)
    const depthDir = new THREE.Vector3(
        depth.axis === 'x' ? 1 : 0,
        depth.axis === 'y' ? 1 : 0,
        depth.axis === 'z' ? 1 : 0,
    ).applyQuaternion(worldQuat)
    if (depthDir.dot(camera.position.clone().sub(center)) < 0) {
        depthDir.negate()
    }
    cssObject.position.addScaledVector(depthDir, depth.value * 0.5 + 0.002)

    // Keep a dark panel under the iframe
    mesh.material = new THREE.MeshBasicMaterial({ color: 0x0a0a0a })

    cssScene.add(cssObject)

    // Invisible hitbox for raycast / click → camera zoom
    desktopHitbox = new THREE.Mesh(
        new THREE.PlaneGeometry(screenW * 1.5, screenH * 1.5),
        new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
        }),
    )
    desktopHitbox.name = 'desktop_screen_hitbox'
    desktopHitbox.userData.isDesktopHitbox = true
    desktopHitbox.position.copy(cssObject.position)
    desktopHitbox.quaternion.copy(cssObject.quaternion)
    desktopHitbox.position.addScaledVector(depthDir, 0.01)
    scene.add(desktopHitbox)
    objectsToIntersect.push(desktopHitbox)

    desktopFocus = {
        target: cssObject.position.clone(),
        normal: depthDir.clone(),
        cameraPos: cssObject.position.clone().addScaledVector(depthDir, DESKTOP_FOCUS_DISTANCE),
    }
}

function applyControlsLimits(limits) {
    controls.minDistance = limits.minDistance
    controls.maxDistance = limits.maxDistance
    controls.minAzimuthAngle = limits.minAzimuthAngle
    controls.maxAzimuthAngle = limits.maxAzimuthAngle
    controls.minPolarAngle = limits.minPolarAngle
    controls.maxPolarAngle = limits.maxPolarAngle
}

function focusDesktopScreen() {
    if (!desktopFocus || isCameraAnimating) return
    if (isDesktopFocused) {
        exitDesktopFocus()
        return
    }

    isCameraAnimating = true
    isDesktopFocused = true
    controls.enabled = false
    applyControlsLimits({
        minDistance: 0.45,
        maxDistance: 4,
        minAzimuthAngle: -Infinity,
        maxAzimuthAngle: Infinity,
        minPolarAngle: 0.05,
        maxPolarAngle: Math.PI - 0.05,
    })

    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(controls.target)

    gsap.to(camera.position, {
        x: desktopFocus.cameraPos.x,
        y: desktopFocus.cameraPos.y,
        z: desktopFocus.cameraPos.z,
        duration: 1.5,
        ease: 'power2.inOut',
    })
    gsap.to(controls.target, {
        x: desktopFocus.target.x,
        y: desktopFocus.target.y,
        z: desktopFocus.target.z,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => controls.update(),
        onComplete: () => {
            isCameraAnimating = false
            controls.enabled = true
            controls.update()
        },
    })
}

function exitDesktopFocus() {
    if (!isDesktopFocused || isCameraAnimating) return

    isCameraAnimating = true
    controls.enabled = false
    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(controls.target)

    gsap.to(camera.position, {
        x: cameraPosition.x,
        y: cameraPosition.y,
        z: cameraPosition.z,
        duration: 1.5,
        ease: 'power2.inOut',
    })
    gsap.to(controls.target, {
        x: cameraTarget.x,
        y: cameraTarget.y,
        z: cameraTarget.z,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => controls.update(),
        onComplete: () => {
            applyControlsLimits(savedControlsLimits)
            isDesktopFocused = false
            isCameraAnimating = false
            controls.enabled = true
            controls.update()
        },
    })
}

/* resize */
window.addEventListener('resize', () => {
    params.width = window.innerWidth
    params.height = window.innerHeight
    params.aspect = params.width / params.height
    renderer.setSize(params.width, params.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    cssRenderer.setSize(params.width, params.height)
    occluderRenderer.setSize(params.width, params.height)
    occluderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    camera.aspect = params.aspect
    camera.updateProjectionMatrix()
})

/* raycaster + get mouse mouvement */
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const touch = new THREE.Vector2()
window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX / params.width * 2 - 1,
    mouse.y = - (event.clientY / params.height) * 2 + 1

    if (isDesktopHitbox(currentIntersects[0].object)) {
        focusDesktopScreen()
        return
    }
})
window.addEventListener('touchmove', (event) => {
    touch.x = event.clientX / params.width * 2 - 1,
    touch.y = - (event.clientY / params.height) * 2 + 1
})
window.addEventListener('click', () => {
    if (isCameraAnimating) return
    if(currentIntersects && currentIntersects.length > 0){
        const object = currentIntersects[0].object

        // if (isDesktopHitbox(object)) {
        //     focusDesktopScreen()
        //     return
        // }

        for (const [key, url] of Object.entries(socialLinks)) {
            if (object.name.includes(key)) {
                const newWindow = window.open()
                newWindow.opener = null
                newWindow.location = url
                newWindow.target = "_blank"
                newWindow.rel = "noopener noreferrer"
                return
            }
        }

        const passion = getPassionEntry(object.name)
        if (passion) {
            passionPanel.open(passion)
        }
    }
})

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') exitDesktopFocus()
})


/* controls */
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enablePan = false;
controls.minDistance = savedControlsLimits.minDistance
controls.maxDistance = savedControlsLimits.maxDistance
controls.minAzimuthAngle = savedControlsLimits.minAzimuthAngle
controls.maxAzimuthAngle = savedControlsLimits.maxAzimuthAngle
controls.minPolarAngle = savedControlsLimits.minPolarAngle
controls.maxPolarAngle = savedControlsLimits.maxPolarAngle
controls.target.set(cameraTarget.x, cameraTarget.y, cameraTarget.z)

/* textures map + loader */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')
dracoLoader.preload()

let onAssetsReady = null;
const assetsReadyPromise = new Promise((resolve) => { onAssetsReady = resolve; });

const progressBar = document.getElementById('splash-progress-bar');
const progressLabel = document.getElementById('splash-progress-label');

const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (_url, loaded, total) => {
    const pct = Math.round((loaded / total) * 100);
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressLabel) progressLabel.textContent = `Loading… ${pct}%`;
};
loadingManager.onLoad = () => {
    if (progressBar) progressBar.style.width = '100%';
    // if (progressLabel) progressLabel.textContent = 'Ready!';
    onAssetsReady();
};

const textureLoader = new THREE.TextureLoader(loadingManager);
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

const loader = new GLTFLoader(loadingManager);
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

                // list objects to intersect (targets + passion props)
                if (child.name.includes("target") || isPassionObject(child.name)) {
                    if (!skipsHoverEffect(child.name)) {
                        ensureHoverUserData(child)
                    }
                    objectsToIntersect.push(child)
                }
                // list letters to animate
                if(child.name.includes("gis_letter")){
                    child.userData.initialPosition = new THREE.Vector3().copy(child.position)
                    gisLetters.push(child)
                }
                if(child.name.includes("hover") || child.name.includes("wall") || child.name.includes("target")
                    || child.name.includes("paper")){
                    ensureHoverUserData(child)
                }
                
                if(child.name.includes("bed_cover")){
                    child.material = new THREE.MeshBasicMaterial({map: bedCover})
                    child.material.needsUpdate = true
                }
        
                if(child.name.includes("gaming_chair_head_rotate")){
                    gamingChairTop = child
                    child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
                }
                // Chair is the only mesh redrawn above the CSS iframe
                if (child.name.includes("gaming_chair")) {
                    child.layers.enable(1)
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

                // desktop screen: live site via CSS3D iframe
                if (child.name.includes("desktop_screen")){
                    child.material = new THREE.MeshBasicMaterial({ color: 0x0a0a0a })
                    child.userData.isDesktopScreen = true
                }
                if (child.name.includes("mac_screen")){
                    const videoMaterial = new THREE.MeshBasicMaterial({
                        map: macScreenVideoTexture
                    })
                    child.material = videoMaterial;
                }
            }
        });
        glb.scene.scale.setScalar(0.08)
        scene.add(glb.scene);
        gisLetters.sort((a, b) => a.name.localeCompare(b.name))

        glb.scene.updateWorldMatrix(true, true)
        glb.scene.traverse((obj) => {
            if (obj.isMesh && obj.userData.isDesktopScreen) {
                mountDesktopCss3D(obj)
            }
        })

        // calculate the limit of the camera using the bounding box of the scene
        // without the background   
        const bbox = new THREE.Box3().makeEmpty();
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

    // clamp the camera position to the minimum camera y (room view only)
    if (!isDesktopFocused && minCameraY !== null && camera.position.y < minCameraY) {
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

        const currentIntersectedObject = currentIntersects[0].object
        const isClickable =
            isDesktopHitbox(currentIntersectedObject)
            || Object.keys(socialLinks).some((key) => currentIntersectedObject.name.includes(key))
            || isPassionObject(currentIntersectedObject.name)
        canvas.style.cursor = isClickable ? 'pointer' : 'default'

        if(currentIntersectedObject !== currentHoveredObject){
            if (currentHoveredObject && !skipsHoverEffect(currentHoveredObject.name)) {
                hoverEffect(currentHoveredObject, false, 1, smoke)
            }
            currentHoveredObject = currentIntersectedObject
            if (!skipsHoverEffect(currentHoveredObject.name)) {
                hoverEffect(currentHoveredObject, true, 1.3, smoke)
            }
        }
    } else {
        canvas.style.cursor = 'default'
        if (currentHoveredObject && !skipsHoverEffect(currentHoveredObject.name)) {
            hoverEffect(currentHoveredObject, false, 1, smoke)
        }
        currentHoveredObject = null
    }
        renderer.render(scene, camera)
        cssRenderer.render(cssScene, camera)

        // Chair above the iframe
        camera.layers.set(1)
        occluderRenderer.render(scene, camera)
        camera.layers.set(0)
    }

animate()
