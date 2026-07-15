/**
 * Passion info panel (open / close / populate).
 * @returns {{ open: (entry: { title: string, description: string }) => void, close: () => void }}
 */
export function initPassionPanel() {
    const panel = document.getElementById('passion-panel')
    const titleEl = document.getElementById('passion-panel-title')
    const bodyEl = document.getElementById('passion-panel-body')
    const closeBtn = document.getElementById('passion-panel-close')
    const backdrop = document.getElementById('passion-panel-backdrop')

    if (!panel || !titleEl || !bodyEl) {
        return { open() {}, close() {} }
    }

    function close() {
        panel.classList.remove('passion-panel--open')
        backdrop?.classList.remove('passion-panel-backdrop--open')
        panel.setAttribute('aria-hidden', 'true')
        backdrop?.setAttribute('aria-hidden', 'true')
    }

    function open(entry) {
        titleEl.textContent = entry.title
        bodyEl.textContent = entry.description
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
