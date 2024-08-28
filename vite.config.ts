import { resolve } from "path";
import { defineConfig } from "vite";
import { crx, type ManifestV3Export } from "@crxjs/vite-plugin";

import manifest from "./manifest.json";
import pkg from "./package.json";

const outDir = resolve(__dirname, "dist");
const publicDir = resolve(__dirname, "public");

const isDev = process.env.__DEV__ === "true";

const extensionManifest = {
	...manifest,
	name: isDev ? `DEV: ${manifest.name}` : manifest.name,
	version: pkg.version,
};

export default defineConfig({
	plugins: [
		crx({
			manifest: extensionManifest as ManifestV3Export,
			contentScripts: {
				injectCss: true,
			},
		}),
	],
	publicDir,
	build: {
		outDir,
		sourcemap: isDev,
		emptyOutDir: !isDev,
	},
});
