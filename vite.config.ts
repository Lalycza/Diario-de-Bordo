import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { existsSync, renameSync } from "node:fs";

const legacyIndex = "index.html";
const legacyIndexBackup = ".index.html.legacy-build";

function hideLegacyIndexDuringBuild() {
  let hidden = false;

  const restore = () => {
    if (hidden && existsSync(legacyIndexBackup)) {
      renameSync(legacyIndexBackup, legacyIndex);
      hidden = false;
    }
  };

  return {
    name: "hide-legacy-index-during-build",
    apply: "build",
    buildStart() {
      if (existsSync(legacyIndex) && !existsSync(legacyIndexBackup)) {
        renameSync(legacyIndex, legacyIndexBackup);
        hidden = true;
      }
    },
    buildEnd(error?: Error) {
      if (error) restore();
    },
    closeBundle() {
      restore();
    },
  };
}

export default defineConfig({
  plugins: [
    hideLegacyIndexDuringBuild(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: "/index.html",
          crawlLinks: false,
        },
      },
    }),
    tailwindcss(),
    nitro(),
    viteReact(),
  ],
});
