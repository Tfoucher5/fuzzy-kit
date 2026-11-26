import type { Directive } from 'vue'

/** v-reveal: adds .ft-reveal, then .is-in the first time the element scrolls into view. */
export const reveal: Directive<HTMLElement> = {
  getSSRProps: () => ({ class: 'ft-reveal' }),
  mounted(el) {
    el.classList.add('ft-reveal')
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in')
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          el.classList.add('is-in')
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    observer.observe(el)
    ;(el as HTMLElement & { _ftReveal?: IntersectionObserver })._ftReveal = observer
  },
  unmounted(el) {
    ;(el as HTMLElement & { _ftReveal?: IntersectionObserver })._ftReveal?.disconnect()
  },
}
