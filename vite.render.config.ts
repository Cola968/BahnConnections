import tailwindcss from "@tailwindcss/vite";
import vinext from "vinext";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

/**
 * Node.js production server for Render.
 * Separate from ChatGPT Sites and Cloudflare Workers builds.
 * @tailwindcss/vite handles @import "tailwindcss" for Vite Node builds.
 */
export default defineConfig({
  plugins: [tailwindcss(), vinext(), nitro()],
});
