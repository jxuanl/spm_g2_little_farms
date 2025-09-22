import { ref, onMounted, onUnmounted } from 'vue';

const MOBILE_BREAKPOINT = 768;

export function useMobile() {
  const isMobile = ref<boolean | undefined>(undefined);

  function checkIsMobile() {
    isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
  }

  onMounted(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    isMobile.value = mql.matches;

    function handleChange(e: MediaQueryListEvent) {
      isMobile.value = e.matches;
    }

    mql.addEventListener('change', handleChange);

    onUnmounted(() => {
      mql.removeEventListener('change', handleChange);
    });
  });

  return isMobile;
}
