
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
 * @param {number} offSetX - the offset of the video texture on the x axis
 * @param {number} offSetY - the offset of the video texture on the y axis
 * @returns {THREE.VideoTexture}
 */
export function loadVideoTexture(path, offSetX, offSetY){
    const video = document.createElement('video')
    video.src = path
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.play()
    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.flipY = true
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.offset.set(offSetX, offSetY)
    return videoTexture
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

