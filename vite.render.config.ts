import tailwindcss from "@tailwindcss/postcss";
import vinext from "vinext";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

/**
 * Full-stack Node.js build for Render.
 * Intentionally does not load @cloudflare/vite-plugin or @openai/sites-vite-plugin.
 * This leaves the existing Sites and standalone Cloudflare Workers builds intact.
 */
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext(), nitro()],
});
