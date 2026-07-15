
import GUI from 'lil-gui'


/**
 * GUI panel
 * @param {{ toggle: () => Promise<void>, state: { isPlaying: boolean } }} audioManager
 * @param {(() => void) | null} [onSoundToggle]
 */
export default function gui(audioManager, onSoundToggle = null){
    const gui = new GUI();
    gui.close()
    gui.hide()
    gui.title("UI")
    
    const soundFolder = gui.addFolder("Sound")
    const soundObj = {
        playSound: async () => {
            await audioManager.toggle()
            onSoundToggle?.()
        }
    }
    
    window.addEventListener('keydown', (event) => {
        if(event.key === 'h'){
            gui.show(gui._hidden);
        }
    })
    /*---------------------- tweaks ----------------------*/
    soundFolder.add(soundObj, "playSound").name("Play/stop sound")

    return audioManager.state
}
