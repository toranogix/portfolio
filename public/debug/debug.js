
import * as THREE from 'three';
import GUI from 'lil-gui'


/**
 * GUI panel
 * @param {THREE.Camera} camera 
 * @param {THREE.Scene} scene 
 * @returns {void}
 */
export default function gui(camera, scene) {
    let soundListener = null;
    let soundTrack = null;
    let audioBuffer = null;
    const state = { isPlaying: false };
  
    const gui = new GUI();
    gui.close();
    gui.title("UI");
  
    const soundFolder = gui.addFolder("Sound");
  
    // preload audio
    function preloadAudio() {
      if (audioBuffer) return;
      if (!soundListener) {
        soundListener = new THREE.AudioListener();
        camera.add(soundListener);
        soundTrack = new THREE.Audio(soundListener);
      }
      new THREE.AudioLoader().load("/audio/lis.mp3", (buffer) => {
        audioBuffer = buffer;
        soundTrack.setBuffer(buffer);
        soundTrack.setLoop(true);
        soundTrack.setVolume(0.2);
        scene.add(soundTrack);
      });
    }
    preloadAudio();
  
    const soundObj = {
      playSound: () => {
        if (!soundListener) {
          soundListener = new THREE.AudioListener();
          camera.add(soundListener);
          soundTrack = new THREE.Audio(soundListener);
        }
  
        const ctx = soundListener.context;
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        // stop music
        if (soundTrack?.isPlaying) {
          soundTrack.stop();
          state.isPlaying = false;
          return;
        }
  
        if (audioBuffer && soundTrack.buffer) {
          soundTrack.play();
          state.isPlaying = true;
        } else {
          new THREE.AudioLoader().load("/audio/lis.mp3", (buffer) => {
            audioBuffer = buffer;
            soundTrack.setBuffer(buffer);
            soundTrack.setLoop(true);
            soundTrack.setVolume(0.2);
            scene.add(soundTrack);
            soundTrack.play();
            state.isPlaying = true;
          });
        }
      },
    };
  
    window.addEventListener("keydown", (event) => {
      if (event.key === "h") gui.show(gui._hidden);
    });
  
    soundFolder.add(soundObj, "playSound").name("Play/stop sound");
    return state;
  }