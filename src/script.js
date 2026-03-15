import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {params} from '../utils/utils.js'

/* scene*/
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

/* camera*/
const camera = new THREE.PerspectiveCamera(75, params.aspect, 0.1, 100)
camera.position.set(2, 5, -5)
scene.add(camera)

/* lights*/
const ambientLight = new THREE.AmbientLight(0xffffff, 6)
scene.add(ambientLight)
const directionalLight = new THREE.DirectionalLight(0xffffff, 6)
directionalLight.position.set(10, 10, 10)
scene.add(directionalLight)


/* renderer*/
const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true})
renderer.setSize(params.width, params.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/* controls */
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enablePan = false;
controls.maxPolarAngle = Math.PI *0.5;
controls.target.set(0, 1, 0)

/* loader */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')
dracoLoader.preload()

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)
gltfLoader.load('/model/room_portfolio.glb', (gltf) => {
    const model = gltf.scene
    model.scale.set(0.08, 0.08, 0.08)
    scene.add(model)
})

/* animate*/
function animate() {
    window.requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
}
animate()