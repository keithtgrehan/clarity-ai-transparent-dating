import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../../", "");
  const webPort = Number(env.WEB_PORT ?? 5173);

  return {
    envDir: "../../",
    plugins: [react()],
    server: {
      host: true,
      port: webPort
    },
    preview: {
      host: true,
      port: webPort
    }
  };
});
