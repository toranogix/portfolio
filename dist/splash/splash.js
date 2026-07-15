import { initSplashLotties } from './splashLottie.js';

/**
 * @param {(withSound: boolean) => void} onEnter
 */
export function initSplash(onEnter) {
    const splash = document.getElementById('splash');
    const enterBtn = document.getElementById('splash-enter');
    const silentBtn = document.getElementById('splash-enter-silent');
    const card = document.querySelector('.splash__card');

    if (!splash || !enterBtn || !silentBtn) return;

    const lotties = initSplashLotties();
    let hasEntered = false;

    requestAnimationFrame(() => {
        card?.classList.add('splash__card--visible');
    });

    function enter(withSound) {
        if (hasEntered) return;
        hasEntered = true;

        lotties?.playClick();

        window.setTimeout(() => {
            splash.classList.add('splash--hidden', 'splash--leaving');
            onEnter(withSound);

            splash.addEventListener('transitionend', () => {
                lotties?.destroy();
                splash.remove();
            }, { once: true });
        }, 400);
    }

    enterBtn.addEventListener('click', () => enter(true));
    silentBtn.addEventListener('click', () => enter(false));
}
