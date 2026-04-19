import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KeyYap',
    short_name: 'KeyYap',
    description: 'The modern social platform for meaningful connections.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#F97316', // Primary color (orange)
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
