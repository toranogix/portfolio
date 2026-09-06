
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {texturesPaths, cameraPosition, cameraTarget, socialLinks, passionInfo, params, desktopUrl} from '../public/constants/constants.js'
import gui from '../public/debug/debug.js'
import { createAudioManager } from '../public/audio/audioManager.js'
import { initMusicButton } from '../public/audio/musicButton.js'
import { initSplash } from '../public/splash/splash.js'
import { initPassionPanel } from '../public/passion/passionPanel.js'
import {hoverEffect, loadVideoTexture, playVideoTexture, applyPlanarScreenUVs} from '../public/helper/helper.js'
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
const occluderDepthMeshes = []

const DESKTOP_IFRAME_WIDTH = 1290
const DESKTOP_IFRAME_HEIGHT = 720
const DESKTOP_FOCUS_DISTANCE = 0.25
const DESKTOP_SCREEN_INSET = 0.01
const desktopCornerWorld = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
const desktopNdc = new THREE.Vector3()
let desktopScreenMesh = null
let desktopOverlay = null
let desktopCornersLocal = null
let desktopHitbox = null
let desktopFocus = null
let isDesktopFocused = false
let isCameraAnimating = false

const savedControlsLimits = {
    minDistance: 3,
    maxDistance: 6,
    minAzimuthAngle: Math.PI * 0.5,
    maxAzimuthAngle: -Math.PI,
    minPolarAngle: Math.PI * 0.2,
    maxPolarAngle: Math.PI * 0.49,
}

// load video and display to screen mac
const macScreenVideoTexture = loadVideoTexture(params.videoTexturePath);

/* scene*/
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

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

// init splash screen
initSplash(async (withSound) => {
    await assetsReadyPromise;
    playVideoTexture(macScreenVideoTexture)
    musicButton?.show()
    if (withSound) await audioManager.play()
    musicButton?.sync()
})


/* lights*/
const ambientLight = new THREE.AmbientLight(0xffffff, 6);
ambientLight.layers.enable(1)
scene.add(ambientLight);


/* renderers
 * Layer stack: WebGL room → projected iframe on screen → WebGL occluder
 */
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true })
renderer.setSize(params.width, params.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const occluderCanvas = document.createElement('canvas')
occluderCanvas.className = 'webgl-occluder'
document.body.appendChild(occluderCanvas)
const occluderRenderer = new THREE.WebGLRenderer({ canvas: occluderCanvas, antialias: false, alpha: true })
occluderRenderer.setClearColor(0x000000, 0)
occluderRenderer.setSize(params.width, params.height)
occluderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))



/* resize */
window.addEventListener('resize', () => {
    params.width = window.innerWidth
    params.height = window.innerHeight
    params.aspect = params.width / params.height
    renderer.setSize(params.width, params.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
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
    mouse.x = event.clientX / params.width * 2 - 1
    mouse.y = -(event.clientY / params.height) * 2 + 1
    if (isCameraAnimating) return

    if (isDesktopFocused) {
        if (event.target?.closest?.('.desktop-css3d')) return
        if (!isPointerOverDesktopHitbox()) exitDesktopFocus()
        return
    }

    if (isPointerOverDesktopHitbox()) focusDesktopScreen()
})

window.addEventListener('touchmove', (event) => {
    touch.x = event.clientX / params.width * 2 - 1
    touch.y = -(event.clientY / params.height) * 2 + 1
})

window.addEventListener('click', () => {
    if (isCameraAnimating || isDesktopFocused) return
    if (currentIntersects && currentIntersects.length > 0) {
        const object = currentIntersects[0].object

        if (isDesktopHitbox(object)) {
            focusDesktopScreen()
            return
        }

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
                if (child.name.includes("gaming_chair") || child.name.includes("mac")) {
                    child.layers.enable(1)
                    child.renderOrder = child.name.includes("mac") ? 2 : 1
                } else if (!child.name.toLowerCase().includes("background")) {
                    child.layers.enable(1)
                    child.renderOrder = 0
                    occluderDepthMeshes.push(child)
                }

                if (child.name.includes("mac_screen")){
                    applyPlanarScreenUVs(child)
                    const videoMaterial = new THREE.MeshBasicMaterial({
                        map: macScreenVideoTexture,
                        toneMapped: false,
                    })
                    child.material = videoMaterial
                    child.material.needsUpdate = true
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

                // desktop screen: live site via projected iframe overlay
                if (child.name.includes("desktop_screen")){
                    child.material = new THREE.MeshBasicMaterial({ color: 0x0a0a0a })
                    child.userData.isDesktopScreen = true
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

        // calculate the limit of the camera using the bounding box of the scene without the background   
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


animate()


// ==========================================================================
/** Functions */
// ==========================================================================
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
        syncDesktopOverlay()

        for (const mesh of occluderDepthMeshes) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const mat of mats) {
                if (mat) mat.colorWrite = false
            }
        }
        camera.layers.set(1)
        occluderRenderer.render(scene, camera)
        camera.layers.set(0)
        for (const mesh of occluderDepthMeshes) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const mat of mats) {
                if (mat) mat.colorWrite = true
            }
        }
    }

/**
 * Ensure the object has the necessary user data for the hover effect
 * @param {THREE.Object3D} child
 * @returns {void}
 */
function ensureHoverUserData(child) {
    if (!child.userData.initialScale) {
        child.userData.initialScale = new THREE.Vector3().copy(child.scale)
    }
    if (!child.userData.initialPosition) {
        child.userData.initialPosition = new THREE.Vector3().copy(child.position)
    }
    if (!child.userData.initialRotation) {
        child.userData.initialRotation = new THREE.Euler().copy(child.rotation)
    }
    if (child.userData.isAnimating === undefined) {
        child.userData.isAnimating = false
    }
}

/**
 * Solve position matrix for the iframe overlay
 * @param {number[][]} A
 * @param {number[]} b
 * @returns {number[] | null}
 */
function solveLinear8(A, b) {
    const n = 8
    const m = A.map((row, i) => [...row, b[i]])
    for (let col = 0; col < n; col++) {
        let pivot = col
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row
        }
        if (Math.abs(m[pivot][col]) < 1e-12) return null
        if (pivot !== col) {
            const tmp = m[col]
            m[col] = m[pivot]
            m[pivot] = tmp
        }
        const div = m[col][col]
        for (let j = col; j <= n; j++) m[col][j] /= div
        for (let row = 0; row < n; row++) {
            if (row === col) continue
            const factor = m[row][col]
            for (let j = col; j <= n; j++) m[row][j] -= factor * m[col][j]
        }
    }
    return m.map((row) => row[n])
}

/**
 * CSS matrix3d that maps a width×height rectangle onto a screen-space quad.
 * Corners are top-left, top-right, bottom-right, bottom-left.
 * @param {number} width
 * @param {number} height
 * @param {{x:number,y:number}[]} dest
 * @returns {string | null}
 */
function quadToMatrix3d(width, height, dest) {
    const src = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
    ]
    const A = []
    const b = []
    for (let i = 0; i < 4; i++) {
        const { x, y } = src[i]
        const u = dest[i].x
        const v = dest[i].y
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
        b.push(u)
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
        b.push(v)
    }
    const h = solveLinear8(A, b)
    if (!h) return null
    return `matrix3d(${[
        h[0], h[3], 0, h[6],
        h[1], h[4], 0, h[7],
        0, 0, 1, 0,
        h[2], h[5], 0, 1,
    ].join(',')})`
}

function signedQuadArea(dest) {
    let area = 0
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4
        area += dest[i].x * dest[j].y - dest[j].x * dest[i].y
    }
    return area * 0.5
}

/**
 * Keep the iframe glued to the desktop screen using the WebGL camera projection
 */
function syncDesktopOverlay() {
    if (!desktopOverlay || !desktopScreenMesh || !desktopCornersLocal) return

    desktopScreenMesh.updateWorldMatrix(true, false)
    camera.updateMatrixWorld()

    const dest = []
    let behind = false
    for (let i = 0; i < 4; i++) {
        const world = desktopCornerWorld[i].copy(desktopCornersLocal[i])
        desktopScreenMesh.localToWorld(world)
        if (world.clone().applyMatrix4(camera.matrixWorldInverse).z > 0) behind = true
        desktopNdc.copy(world).project(camera)
        dest.push({
            x: (desktopNdc.x * 0.5 + 0.5) * params.width,
            y: (-desktopNdc.y * 0.5 + 0.5) * params.height,
        })
    }

    const matrix = !behind && signedQuadArea(dest) > 4
        ? quadToMatrix3d(DESKTOP_IFRAME_WIDTH, DESKTOP_IFRAME_HEIGHT, dest)
        : null

    desktopOverlay.style.visibility = matrix ? 'visible' : 'hidden'
    if (matrix) desktopOverlay.style.transform = matrix
}

/**
 * Order 4 local-space corners as TL, TR, BR, BL from the current camera view
 * @param {THREE.Mesh} mesh
 * @param {THREE.Vector3[]} locals
 * @returns {THREE.Vector3[]}
 */
function orderScreenCorners(mesh, locals) {
    const projected = locals.map((local) => {
        const world = local.clone()
        mesh.localToWorld(world)
        const ndc = world.clone().project(camera)
        return {
            local,
            x: (ndc.x * 0.5 + 0.5) * params.width,
            y: (-ndc.y * 0.5 + 0.5) * params.height,
        }
    })
    const score = (p) => p.x + p.y
    projected.sort((a, b) => score(a) - score(b))
    const tl = projected[0]
    const br = projected[3]
    const mid = [projected[1], projected[2]]
    const tr = mid[0].x >= mid[1].x ? mid[0] : mid[1]
    const bl = tr === mid[0] ? mid[1] : mid[0]
    return [tl.local, tr.local, br.local, bl.local]
}

/**
 * Place a live iframe on the desktop_screen mesh.
 * @param {THREE.Mesh} mesh
 */
function mountDesktopCss3D(mesh) {
    desktopScreenMesh = mesh

    const overlay = document.createElement('div')
    overlay.className = 'desktop-css3d'
    overlay.style.width = `${DESKTOP_IFRAME_WIDTH}px`
    overlay.style.height = `${DESKTOP_IFRAME_HEIGHT}px`

    const iframe = document.createElement('iframe')
    iframe.src = desktopUrl
    iframe.title = 'Romangix OS'
    iframe.referrerPolicy = 'no-referrer'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.tabIndex = -1
    overlay.appendChild(iframe)
    occluderCanvas.before(overlay)
    desktopOverlay = overlay
    overlay.addEventListener('mouseleave', (event) => {
        if (!isDesktopFocused || isCameraAnimating) return
        mouse.x = event.clientX / params.width * 2 - 1
        mouse.y = -(event.clientY / params.height) * 2 + 1
        if (!isPointerOverDesktopHitbox()) exitDesktopFocus()
    })

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
    const depthDir = new THREE.Vector3(
        depth.axis === 'x' ? 1 : 0,
        depth.axis === 'y' ? 1 : 0,
        depth.axis === 'z' ? 1 : 0,
    ).applyQuaternion(worldQuat)
    if (depthDir.dot(camera.position.clone().sub(center)) < 0) {
        depthDir.negate()
    }

    const probeMin = localCenter.clone()
    const probeMax = localCenter.clone()
    probeMin[depth.axis] = bb.min[depth.axis]
    probeMax[depth.axis] = bb.max[depth.axis]
    mesh.localToWorld(probeMin)
    mesh.localToWorld(probeMax)
    const front = probeMax.distanceToSquared(camera.position) < probeMin.distanceToSquared(camera.position)
        ? bb.max[depth.axis]
        : bb.min[depth.axis]
    const min = bb.min
    const max = bb.max

    let unordered
    if (depth.axis === 'z') {
        unordered = [
            new THREE.Vector3(min.x, max.y, front),
            new THREE.Vector3(max.x, max.y, front),
            new THREE.Vector3(max.x, min.y, front),
            new THREE.Vector3(min.x, min.y, front),
        ]
    } else if (depth.axis === 'x') {
        unordered = [
            new THREE.Vector3(front, max.y, min.z),
            new THREE.Vector3(front, max.y, max.z),
            new THREE.Vector3(front, min.y, max.z),
            new THREE.Vector3(front, min.y, min.z),
        ]
    } else {
        unordered = [
            new THREE.Vector3(min.x, front, max.z),
            new THREE.Vector3(max.x, front, max.z),
            new THREE.Vector3(max.x, front, min.z),
            new THREE.Vector3(min.x, front, min.z),
        ]
    }

    const cornerCenter = unordered[0].clone()
        .add(unordered[1])
        .add(unordered[2])
        .add(unordered[3])
        .multiplyScalar(0.25)
    desktopCornersLocal = orderScreenCorners(
        mesh,
        unordered.map((corner) => corner.lerp(cornerCenter, DESKTOP_SCREEN_INSET)),
    )

    let screenW
    let screenH
    const screenQuat = worldQuat.clone()
    if (depth.axis === 'z') {
        screenW = size.x
        screenH = size.y
    } else if (depth.axis === 'x') {
        screenQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2))
        screenW = size.z
        screenH = size.y
    } else {
        screenQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2))
        screenW = size.x
        screenH = size.z
    }

    const screenPos = center.clone().addScaledVector(depthDir, depth.value * 0.5 + 0.002)
    mesh.material = new THREE.MeshBasicMaterial({ color: 0x0a0a0a })

    desktopHitbox = new THREE.Mesh(
        new THREE.PlaneGeometry(screenW * 1.2, screenH * 1.2),
        new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
        }),
    )
    desktopHitbox.name = 'desktop_screen_hitbox'
    desktopHitbox.userData.isDesktopHitbox = true
    desktopHitbox.position.copy(screenPos)
    desktopHitbox.quaternion.copy(screenQuat)
    desktopHitbox.position.addScaledVector(depthDir, 0.01)
    scene.add(desktopHitbox)
    objectsToIntersect.push(desktopHitbox)

    desktopFocus = {
        target: screenPos.clone(),
        normal: depthDir.clone(),
        cameraPos: screenPos.clone().addScaledVector(depthDir, DESKTOP_FOCUS_DISTANCE),
    }

    syncDesktopOverlay()
}

/** Clickable passion props that should not scale on hover.
 * @param {string} objectName - the name of the object
*/
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

function isPointerOverDesktopHitbox() {
    if (!desktopHitbox) return false
    raycaster.setFromCamera(mouse, camera)
    return raycaster.intersectObject(desktopHitbox).length > 0
}

function setDesktopInteractive(enabled) {
    if (!desktopOverlay) return
    desktopOverlay.classList.toggle('desktop-css3d--interactive', enabled)
    const iframe = desktopOverlay.querySelector('iframe')
    if (iframe) {
        iframe.tabIndex = enabled ? 0 : -1
        iframe.setAttribute('aria-hidden', enabled ? 'false' : 'true')
    }
}

/**
 * Apply controls limits to the camera.
 * @param {*} limits 
 */
function applyControlsLimits(limits) {
    controls.minDistance = limits.minDistance
    controls.maxDistance = limits.maxDistance
    controls.minAzimuthAngle = limits.minAzimuthAngle
    controls.maxAzimuthAngle = limits.maxAzimuthAngle
    controls.minPolarAngle = limits.minPolarAngle
    controls.maxPolarAngle = limits.maxPolarAngle
}

/**
 * Focus the desktop screen.
 */
function focusDesktopScreen() {
    if (!desktopFocus || isCameraAnimating || isDesktopFocused) return

    isCameraAnimating = true
    isDesktopFocused = true
    controls.enabled = false
    applyControlsLimits({
        minDistance: 0.46,
        maxDistance: savedControlsLimits.maxDistance,
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
            setDesktopInteractive(true)
            controls.update()
        },
    })
}

/**
 * Exit the desktop focus.
 */
function exitDesktopFocus() {
    if (!isDesktopFocused || isCameraAnimating) return

    isCameraAnimating = true
    controls.enabled = false
    setDesktopInteractive(false)
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
