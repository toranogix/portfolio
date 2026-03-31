
import * as THREE from 'three';
import GUI from 'lil-gui'


export default function gui(){
    const gui = new GUI();
    gui.title("Debug UI")
    
    const soundFolder = gui.addFolder("Sound")
    const soundObj = {
        playSound: () => {
            if (soundTrack?.isPlaying) {
                soundTrack.stop()
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
                    soundListener.context.resume().then(() => soundTrack.play())
                })
                return
            }
            if (soundTrack.buffer) {
                soundListener.context.resume().then(() => soundTrack.play())
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
}
