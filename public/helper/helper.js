
import gsap from 'gsap'

/**
 * Hover effect for an object
 * @param {THREE.Object3D} object 
 * @param {boolean} isHovering - true if the object is being hovered, false otherwise
 * @param {number} scale - the scale of the object when hovered
 * @returns {void}
 */
export function hoverEffect(object, isHovering, scale){
    gsap.killTweensOf(object.scale);

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
