const TITLE = 'Roomangix Portfolio Showcase 2025';
const SUBTITLE = 'Click start to begin';
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%<&*/'

/**
 * @param {(withSound: boolean) => void} onEnter
 */
export function initSplash(onEnter) {
    const splash = document.getElementById('splash');
    const enterBtn = document.getElementById('splash-enter');
    const silentBtn = document.getElementById('splash-enter-silent');
    const titleEl = document.querySelector('.splash__title');
    const titleText = document.querySelector('.splash__title-text');
    const subtitleText = document.querySelector('.splash__subtitle-text');

    if (!splash || !enterBtn || !silentBtn) return;

    let hasEntered = false;
    /** @type {{ clear: () => void } | null} */
    let glitchLoop = null;

    function enter(withSound) {
        if (hasEntered) return;
        hasEntered = true;

        glitchLoop?.clear();
        splash.classList.add('splash--hidden');
        onEnter(withSound);

        splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    }

    enterBtn.addEventListener('click', () => enter(true));
    silentBtn.addEventListener('click', () => enter(false));

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !titleText || !subtitleText || !titleEl) {
        if (titleText) titleText.textContent = TITLE;
        if (subtitleText) subtitleText.textContent = SUBTITLE;
        enterBtn.classList.add('splash__start--ready');
        return;
    }

    runCyberIntro({ titleEl, titleText, subtitleText, enterBtn }).then(() => {
        if (hasEntered) return;
        glitchLoop = scheduleGlitches(titleEl, () => hasEntered);
    });
}

/**
 * @param {{
 *   titleEl: Element,
 *   titleText: Element,
 *   subtitleText: Element,
 *   enterBtn: HTMLElement,
 * }} els
 */
async function runCyberIntro({ titleEl, titleText, subtitleText, enterBtn }) {
    const cursor = document.createElement('span');
    cursor.className = 'cyber-cursor';
    cursor.textContent = '▌';
    titleText.after(cursor);

    await scrambleReveal(titleText, TITLE, 16);
    titleEl.classList.add('splash__title--glitch');
    await wait(280);
    titleEl.classList.remove('splash__title--glitch');

    cursor.remove();
    const subCursor = document.createElement('span');
    subCursor.className = 'cyber-cursor';
    subCursor.textContent = '▌';
    subtitleText.after(subCursor);

    await typeText(subtitleText, SUBTITLE, 28);
    await wait(180);
    subCursor.remove();
    enterBtn.classList.add('splash__start--ready');
}

/**
 * @param {Element} el
 * @param {string} finalText
 * @param {number} tickMs
 */
async function scrambleReveal(el, finalText, tickMs) {
    const chars = finalText.split('');
    const revealed = chars.map((ch) => (ch === ' ' ? ' ' : null));

    for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ' ') {
            revealed[i] = ' ';
            continue;
        }

        const cycles = 2 + Math.floor(Math.random() * 2);
        for (let c = 0; c < cycles; c++) {
            revealed[i] = randomGlyph();
            el.textContent = revealFrame(revealed, chars, i);
            await wait(tickMs);
        }
        revealed[i] = chars[i];
        el.textContent = revealFrame(revealed, chars, i);
        await wait(tickMs);
    }

    el.textContent = finalText;
}

/**
 * @param {(string|null)[]} revealed
 * @param {string[]} chars
 * @param {number} upTo
 */
function revealFrame(revealed, chars, upTo) {
    return chars
        .map((ch, i) => {
            if (i > upTo) return '';
            if (ch === ' ') return ' ';
            return revealed[i] ?? randomGlyph();
        })
        .join('');
}

/**
 * @param {Element} el
 * @param {string} text
 * @param {number} tickMs
 */
async function typeText(el, text, tickMs) {
    el.textContent = '';
    for (let i = 0; i < text.length; i++) {
        el.textContent = text.slice(0, i + 1);
        await wait(tickMs + Math.random() * 18);
    }
}

/**
 * @param {Element} titleEl
 * @param {() => boolean} isDone
 * @returns {{ clear: () => void }}
 */
function scheduleGlitches(titleEl, isDone) {
    let timerId = null;
    let glitchEndId = null;

    const run = () => {
        if (isDone()) return;

        titleEl.classList.add('splash__title--glitch');
        glitchEndId = setTimeout(() => titleEl.classList.remove('splash__title--glitch'), 260);

        const next = 2200 + Math.random() * 3800;
        timerId = setTimeout(run, next);
    };

    timerId = setTimeout(run, 1800 + Math.random() * 1200);

    return {
        clear() {
            if (timerId) clearTimeout(timerId);
            if (glitchEndId) clearTimeout(glitchEndId);
            titleEl.classList.remove('splash__title--glitch');
        },
    };
}

function randomGlyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

/** @param {number} ms */
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
