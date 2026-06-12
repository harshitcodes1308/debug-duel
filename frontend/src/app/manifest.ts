import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DebugDuel',
    short_name: 'DebugDuel',
    description: '1v1 Real-time Debugging Arena for software engineers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D0D12',
    theme_color: '#13131A',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
