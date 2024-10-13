import { defineConfig } from "vite";

export default defineConfig({
  base: "/diamond-square/",
  root: "src",
  build: {
    target: 'esnext',
    outDir: "../dist",
    emptyOutDir: true,
  },
});
