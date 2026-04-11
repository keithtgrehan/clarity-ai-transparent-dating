import { config } from "dotenv";
import { resolveRepoPath } from "./paths.js";

config({ path: resolveRepoPath(".env") });
config({ path: resolveRepoPath(".env.local"), override: true });
