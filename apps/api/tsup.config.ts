import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/scripts/loadSeeds.ts"],
  format: ["esm"],
  sourcemap: true,
  clean: true,
  outDir: "dist",
  noExternal: ["@clarity/shared"]
});
