/** @type {import('next').NextConfig} */
// Strict mode double-mounts effects in dev, which Leaflet's map container can't survive.
// NEXT_DIST lets a production build run beside the dev server without sharing .next.
export default { reactStrictMode: false, distDir: process.env.NEXT_DIST || ".next" };
