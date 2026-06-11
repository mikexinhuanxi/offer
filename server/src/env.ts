import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(here, "..");
const rootDir = resolve(serverDir, "..");

config({ path: resolve(rootDir, ".env") });
config({ path: resolve(serverDir, ".env") });
config();
