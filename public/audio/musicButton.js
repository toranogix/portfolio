/**
 * @param {{ toggle: () => void, play: () => Promise<void>, stop: () => void, state: { isPlaying: boolean } }} audioManager
 */
export function initMusicButton(audioManager) {
    const button = document.getElementById('music-toggle');
    if (!button) return;

    function syncButton() {
        const playing = audioManager.state.isPlaying;
        button.classList.toggle('music-toggle--playing', playing);
        button.setAttribute('aria-pressed', String(playing));
        button.setAttribute('aria-label', playing ? 'Stop music' : 'Play music');
    }

    button.addEventListener('click', async () => {
        await audioManager.toggle();
        syncButton();
    });

    return {
        show() {
            button.hidden = false;
            syncButton();
        },
        sync: syncButton,
    };
}
