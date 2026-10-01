import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(callback: () => void) {
 const mql = window.matchMedia(QUERY)
 mql.addEventListener("change", callback)
 return () => mql.removeEventListener("change", callback)
}

// `useSyncExternalStore` alih-alih `useState` + effect: nilai viewport adalah
// sumber data eksternal, jadi React yang berlangganan. Snapshot server
// (`false`) juga menghapus hydration mismatch — render server dan render
// hidrasi sama-sama "bukan mobile" sebelum effect berjalan.
export function useIsMobile(): boolean {
 return React.useSyncExternalStore(
 subscribe,
 () => window.matchMedia(QUERY).matches,
 () => false,
 )
}
