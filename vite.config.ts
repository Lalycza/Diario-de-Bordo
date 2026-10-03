import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    tanstackStart({
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
      },
      pages: [
        {
          path: "/",
          prerender: {
            enabled: true,
            outputPath: "/index.html",
          },
        },
      ],
    }),
    tailwindcss(),
    nitro(),
    viteReact(),
  ],
});
