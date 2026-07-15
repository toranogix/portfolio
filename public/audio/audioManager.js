import * as THREE from 'three';

/**
 * @param {THREE.Camera} camera
 * @param {THREE.Scene} scene
 * @param {{ src?: string, volume?: number, loop?: boolean }} [options]
 */
export function createAudioManager(camera, scene, options = {}) {
    const { src = '/audio/lis.mp3', volume = 0.2, loop = true } = options;
    let soundListener = null;
    let soundTrack = null;
    const state = { isPlaying: false };

    function init() {
        if (soundListener) return Promise.resolve();
        soundListener = new THREE.AudioListener();
        camera.add(soundListener);
        soundTrack = new THREE.Audio(soundListener);

        return new Promise((resolve) => {
            new THREE.AudioLoader().load(src, (buffer) => {
                soundTrack.setBuffer(buffer);
                soundTrack.setLoop(loop);
                soundTrack.setVolume(volume);
                scene.add(soundTrack);
                resolve();
            });
        });
    }

    async function play() {
        if (!soundListener) await init();
        if (!soundTrack?.buffer) return;
        await soundListener.context.resume();
        soundTrack.play();
        state.isPlaying = true;
    }

    function stop() {
        if (soundTrack?.isPlaying) {
            soundTrack.stop();
            state.isPlaying = false;
        }
    }

    async function toggle() {
        if (soundTrack?.isPlaying) stop();
        else await play();
    }

    return { play, stop, toggle, state };
}
