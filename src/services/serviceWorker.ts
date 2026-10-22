export type ServiceWorkerStatus = { supported: boolean; registered: boolean; error?: string }

export async function registerMineServiceWorker(): Promise<ServiceWorkerStatus> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return { supported: 'serviceWorker' in navigator, registered: false }
  try {
    const registration = await navigator.serviceWorker.register('/Mibbbee/sw.js', { scope: '/Mibbbee/' })
    await navigator.serviceWorker.ready
    return { supported: true, registered: Boolean(registration) }
  } catch (error) {
    return { supported: true, registered: false, error: error instanceof Error ? error.message : 'تعذر تسجيل Service Worker.' }
  }
}
