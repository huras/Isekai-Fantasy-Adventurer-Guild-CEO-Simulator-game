let manifest: string[] = []
let loaded = false

export async function loadPortraitManifest() {
  if (loaded && manifest.length) return manifest
  try {
    const res = await fetch('/adventurers/manifest.json', { cache: 'no-cache' })
    if (res.ok) {
      manifest = await res.json()
      loaded = true
    }
  } catch (e) {
    console.warn('Failed to load portrait manifest', e)
  }
  return manifest
}

export function randomPortrait() {
  if (!manifest.length) return null
  const file = manifest[Math.floor(Math.random() * manifest.length)]
  return `/adventurers/${file}`
}


