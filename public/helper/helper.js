
import gsap from 'gsap'
import * as THREE from 'three'

/**
 * Hover effect for an object
 * @param {THREE.Object3D} object 
 * @param {boolean} isHovering - true if the object is being hovered, false otherwise
 * @param {number} scale - the scale of the object when hovered
 * @returns {void}
 */
export function hoverEffect(object, isHovering, scale, smoke){
    gsap.killTweensOf(object.scale);
    gsap.killTweensOf(object.rotation);

    if (object.name.includes("mug_target_hover")) {
        gsap.killTweensOf(smoke.scale);
        if (isHovering) {
          gsap.to(smoke.scale, {
            x: 1.3,
            y: 1.3,
            z: 1.3,
            duration: 0.5,
            ease: "back.out(2)",
          });
        } else {
          gsap.to(smoke.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.3,
            ease: "back.out(2)",
          });
        }
      }

    object.userData.isAnimating = true;
    if(isHovering){
        gsap.to(object.scale, {
            x: object.userData.initialScale.x * scale,
            y: object.userData.initialScale.y * scale,
            z: object.userData.initialScale.z * scale,
            duration: 0.5,
            ease: "back.out(2)",    
        })
        
        // add rotation effect to github and linkedin logos
        if(object.name.includes("github") || object.name.includes("linkedin")){
            gsap.to(object.rotation, {
                y: object.userData.initialRotation.y - Math.PI / 10,
                duration: 0.5,
                ease: "back.out(2)",
            })
        }

    } else {
            gsap.to(object.scale, {
                x: object.userData.initialScale.x,
                y: object.userData.initialScale.y,
                z: object.userData.initialScale.z,
                duration: 0.3,
                ease: "back.out(2)",
            });

            if(object.name.includes("github") || object.name.includes("linkedin")){
                gsap.to(object.rotation, {
                    y: object.userData.initialRotation.y,
                    duration: 0.5,
                    ease: "back.out(2)",
                })
            }
        }
}


/**
 * Load a video texture
 * @param {string} path - the path to the video texture
 * @param {number} [offSetX=0] - the offset of the video texture on the x axis
 * @param {number} [offSetY=0] - the offset of the video texture on the y axis
 * @returns {THREE.VideoTexture}
 */
export function loadVideoTexture(path, offSetX = 0, offSetY = 0){
    const video = document.createElement('video')
    video.src = path
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.preload = 'auto'
    video.setAttribute('playsinline', '')
    video.play().catch(() => {})

    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.colorSpace = THREE.SRGBColorSpace
    videoTexture.flipY = false
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.generateMipmaps = false
    videoTexture.offset.set(offSetX, offSetY)
    return videoTexture
}

/**
 * Start playback on a VideoTexture (call after a user gesture).
 * @param {THREE.VideoTexture} texture
 */
export function playVideoTexture(texture) {
    const video = texture?.image
    if (video && typeof video.play === 'function') {
        video.play().catch(() => {})
    }
}

/**
 * Rebuild UVs so a planar screen mesh maps a video across its full face.
 * @param {THREE.Mesh} mesh
 */
export function applyPlanarScreenUVs(mesh) {
    const geometry = mesh.geometry
    const position = geometry?.attributes?.position
    if (!position) return

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i)
        const y = position.getY(i)
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
    }

    const spanX = maxX - minX || 1
    const spanY = maxY - minY || 1
    const uv = new Float32Array(position.count * 2)

    for (let i = 0; i < position.count; i++) {
        uv[i * 2] = (position.getX(i) - minX) / spanX
        uv[i * 2 + 1] = (maxY - position.getY(i)) / spanY
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

/**
 * Project a mesh bounding box to 2D screen coordinates
 * @param {THREE.Object3D} mesh
 * @param {THREE.Camera} camera
 * @param {number} width
 * @param {number} height
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function getProjectedBounds(mesh, camera, width, height) {
    const box = new THREE.Box3().setFromObject(mesh)
    const corner = new THREE.Vector3()
    const projected = []

    for (const x of [box.min.x, box.max.x]) {
        for (const y of [box.min.y, box.max.y]) {
            for (const z of [box.min.z, box.max.z]) {
                corner.set(x, y, z).project(camera)
                projected.push({
                    x: (corner.x * 0.5 + 0.5) * width,
                    y: (-corner.y * 0.5 + 0.5) * height,
                })
            }
        }
    }

    const xs = projected.map((point) => point.x)
    const ys = projected.map((point) => point.y)

    return {
        left: Math.min(...xs),
        top: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
    }
}

/**
 * Ensure the object has the necessary user data for the hover effect
 * @param {THREE.Object3D} child
 * @returns {void}
 */
export function ensureHoverUserData(child) {
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
