'use client'

import { useSyncExternalStore } from 'react'

// SSR ổn định; sau hydration chỉ hiện ba khóa/trang ở màn hình dưới 640px.
const query = '(max-width: 639px)'
function subscribe(callback: () => void) {
  const media = window.matchMedia?.(query)
  media?.addEventListener('change', callback)
  return () => media?.removeEventListener('change', callback)
}
const snapshot = () => window.matchMedia?.(query).matches ?? false
export default function useCoursePageSize() {
  return useSyncExternalStore(subscribe, snapshot, () => false) ? 3 : 6
}
