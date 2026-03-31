
import gsap from 'gsap'

/**
 * Hover effect for an object
 * @param {THREE.Object3D} object 
 * @param {boolean} isHovering - true if the object is being hovered, false otherwise
 * @param {number} scale - the scale of the object when hovered
 * @returns {void}
 */
export function hoverEffect(object, isHovering, scale){
    if(object.userData.isAnimating) return;

    object.userData.isAnimating = true;
    if(isHovering){
        gsap.to(object.scale, {
            x: object.userData.initialScale.x * scale,
            y: object.userData.initialScale.y * scale,
            z: object.userData.initialScale.z * scale,
            duration: 0.5,
            ease: "bounce.in(1.8)",
            onComplete: () => {
                object.userData.isAnimating = false;
            }
        });
    }
}
