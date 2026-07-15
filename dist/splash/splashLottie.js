import { DotLottie } from '@lottiefiles/dotlottie-web';

const LOTTIE_LAYOUT = { fit: 'contain', align: [0.5, 0.5] };

function createPlayer(canvas, src, options = {}) {
    if (!canvas) return null;

    const player = new DotLottie({
        canvas,
        src,
        autoplay: options.autoplay ?? true,
        loop: options.loop ?? true,
        speed: options.speed ?? 1,
        layout: LOTTIE_LAYOUT,
        renderConfig: {
            autoResize: true,
            devicePixelRatio: Math.min(window.devicePixelRatio, 2),
        },
    });

    player.setBackgroundColor('transparent');
    return player;
}

export function initSplashLotties() {
    const players = [];

    const bg = createPlayer(
        document.getElementById('splash-lottie-bg'),
        '/lottie/lines.json',
        { speed: 0.45 },
    );
    const hero = createPlayer(
        document.getElementById('splash-lottie-hero'),
        '/lottie/computer.json',
    );
    const music = createPlayer(
        document.getElementById('splash-lottie-music'),
        '/lottie/music.json',
        { speed: 0.75 },
    );
    const click = createPlayer(
        document.getElementById('splash-lottie-click'),
        '/lottie/click.json',
        { loop: false, autoplay: false },
    );

    [bg, hero, music, click].filter(Boolean).forEach((player) => players.push(player));

    return {
        playClick() {
            if (!click) return;
            click.stop();
            click.play();
        },
        destroy() {
            players.forEach((player) => player.destroy());
        },
    };
}
