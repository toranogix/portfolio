/**
 * Passion info panel (open / close / populate).
 * @returns {{ open: (entry: { title: string, description: string, image?: string, video?: string }) => void, close: () => void }}
 */
export function initPassionPanel() {
    const panel = document.getElementById('passion-panel')
    const titleEl = document.getElementById('passion-panel-title')
    const bodyEl = document.getElementById('passion-panel-body')
    const closeBtn = document.getElementById('passion-panel-close')
    const backdrop = document.getElementById('passion-panel-backdrop')
    const mediaEl = document.getElementById('passion-panel-media')
    const imageEl = document.getElementById('passion-panel-image')
    const videoEl = document.getElementById('passion-panel-video')

    if (!panel || !titleEl || !bodyEl) {
        return { open() {}, close() {} }
    }

    const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?|$)/i

    function isVideoPath(src) {
        return VIDEO_EXT.test(src || '')
    }

    function resetMedia() {
        if (imageEl) {
            imageEl.removeAttribute('src')
            imageEl.alt = ''
            imageEl.hidden = true
        }
        if (videoEl) {
            videoEl.pause()
            videoEl.removeAttribute('src')
            videoEl.load()
            videoEl.hidden = true
        }
        if (mediaEl) mediaEl.hidden = true
    }

    function showImage(src, title) {
        if (!imageEl) return false
        imageEl.src = src
        imageEl.alt = title || ''
        imageEl.hidden = false
        return true
    }

    function showVideo(src) {
        if (!videoEl) return false
        videoEl.src = src
        videoEl.hidden = false
        videoEl.load()
        videoEl.play().catch(() => {})
        return true
    }

    function close() {
        panel.classList.remove('passion-panel--open')
        backdrop?.classList.remove('passion-panel-backdrop--open')
        panel.setAttribute('aria-hidden', 'true')
        backdrop?.setAttribute('aria-hidden', 'true')
        resetMedia()
    }

    function open(entry) {
        titleEl.textContent = entry.title
        bodyEl.textContent = entry.description
        resetMedia()

        const imageSrc = entry.image?.trim() || ''
        const videoSrc = entry.video?.trim() || ''
        let hasMedia = false

        if (imageSrc && isVideoPath(imageSrc) && !videoSrc) {
            hasMedia = showVideo(imageSrc)
        } else {
            if (imageSrc && !isVideoPath(imageSrc)) {
                hasMedia = showImage(imageSrc, entry.title) || hasMedia
            }
            if (videoSrc) {
                hasMedia = showVideo(videoSrc) || hasMedia
            }
        }

        if (mediaEl) mediaEl.hidden = !hasMedia

        panel.classList.add('passion-panel--open')
        backdrop?.classList.add('passion-panel-backdrop--open')
        panel.setAttribute('aria-hidden', 'false')
        backdrop?.setAttribute('aria-hidden', 'false')
        closeBtn?.focus()
    }

    closeBtn?.addEventListener('click', close)
    backdrop?.addEventListener('click', close)
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close()
    })

    return { open, close }
}
