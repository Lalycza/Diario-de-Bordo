import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { existsSync, copyFileSync, renameSync } from "node:fs";

const legacyIndex = "index.html";
const legacyIndexBackup = ".index.html.legacy-build";

function hideLegacyIndexDuringBuild() {
  let hidden = false;

  const restoreLegacy = () => {
    if (hidden && existsSync(legacyIndexBackup)) {
      renameSync(legacyIndexBackup, legacyIndex);
      hidden = false;
    }
  };

  const exposeGeneratedShell = () => {
    const generatedShell = ".vercel/output/static/index.html";

    if (hidden && existsSync(generatedShell)) {
      copyFileSync(generatedShell, legacyIndex);
    }
  };

  return {
    name: "use-tanstack-shell-with-legacy-index-preserved",
    apply: "build",
    buildStart() {
      if (existsSync(legacyIndex) && !existsSync(legacyIndexBackup)) {
        renameSync(legacyIndex, legacyIndexBackup);
        hidden = true;
      }
    },
    buildEnd(error?: Error) {
      if (error) {
        restoreLegacy();
      } else {
        exposeGeneratedShell();
      }
    },
    closeBundle() {
      restoreLegacy();
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
