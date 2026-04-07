
import * as THREE from 'three';
import GUI from 'lil-gui'


/**
 * GUI panel
 * @param {THREE.Camera} camera 
 * @param {THREE.Scene} scene 
 * @param {Mesh} vinyl disk mesh 
 * @returns {void}
 */
export default function gui(camera, scene){
    let soundListener = null
    let soundTrack = null
    const gui = new GUI();
    gui.close()

    const state = {isPlaying: false}
    gui.title("UI")
    
    const soundFolder = gui.addFolder("Sound")
    const soundObj = {
        playSound: () => {
            if (soundTrack?.isPlaying) {
                soundTrack.stop()
                state.isPlaying = false
                return
            }
            if (!soundListener) {
                soundListener = new THREE.AudioListener()
                camera.add(soundListener)
                soundTrack = new THREE.Audio(soundListener)
                new THREE.AudioLoader().load("/audio/lis.mp3", (buffer) => {
                    soundTrack.setBuffer(buffer)
                    soundTrack.setLoop(true)
                    soundTrack.setVolume(0.2)
                    scene.add(soundTrack)
                    soundListener.context.resume().then(() => {
                        soundTrack.play()
                        state.isPlaying = true
                    })
                })
                return
            }
            if (soundTrack.buffer) {
                soundListener.context.resume().then(() => {
                    soundTrack.play()
                    state.isPlaying = true
                })
            }
        }
    }
    
    window.addEventListener('keydown', (event) => {
        if(event.key === 'h'){
            gui.show(gui._hidden);
        }
    })
    /*---------------------- tweaks ----------------------*/
    soundFolder.add(soundObj, "playSound").name("Play/stop sound")

    return state
}
