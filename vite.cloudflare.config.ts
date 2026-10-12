import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/postcss";
import vinext from "vinext";
import { defineConfig } from "vite";

/**
 * Build the EXISTING V55 app for an independent Cloudflare Worker.
 * Do not import the ChatGPT Sites plugin or its hosting.json configuration:
 * vite.config.ts continues to be used by the existing Sites environment.
 *
 * The RSC and SSR environments must execute inside the same Worker so that
 * App Router route handlers, API endpoints and dynamic data remain available.
 */
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    vinext(),
    cloudflare({
      configPath: "./wrangler.cloudflare.jsonc",
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
