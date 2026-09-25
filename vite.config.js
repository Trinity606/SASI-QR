import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Peladen dijalankan dari server.js (Vite dipasang sebagai middleware),
// jadi berkas ini hanya mengatur plugin dan hasil build.
export default defineConfig({ plugins: [react()] });
