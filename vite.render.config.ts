import tailwindcss from "@tailwindcss/vite";
import vinext from "vinext";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

/**
 * Node.js production server for Render.
 * Separate from ChatGPT Sites and Cloudflare Workers builds.
 * @tailwindcss/vite handles @import "tailwindcss" for Vite Node builds.
 */
export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": fileURLToPath(new URL("./app/render/cloudflare-env-shim.ts", import.meta.url)),
    },
  },
  plugins: [tailwindcss(), vinext(), nitro()],
});
