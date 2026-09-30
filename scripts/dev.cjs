const path = require("node:path");
const { pathToFileURL } = require("node:url");
require("dotenv").config({ path: ".env.local" });

const viteCli = path.join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
process.argv = [process.argv[0], viteCli, ...process.argv.slice(2)];
import(pathToFileURL(viteCli).href);
