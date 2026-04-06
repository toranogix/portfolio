
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