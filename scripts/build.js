import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import brotliSize from "brotli-size";
import * as esbuild from "esbuild";

const NAME = 'esor';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_PATH = path.join(__dirname, "../");

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function outputSize(file) {
    const size = bytesToSize(brotliSize.sync(fs.readFileSync(file)));
    console.log("\x1b[32m", `Bundle size: ${size}`);
}

function bytesToSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "n/a";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    if (i === 0) return `${bytes} ${sizes[i]}`;
    return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

async function build(options) {
    options.define = options.define ?? {};
    options.define["process.env.NODE_ENV"] = process.argv.includes("--watch")
        ? `'development'`
        : `'production'`;
    
    const isWatching = process.argv.includes("--watch");
    
    try {
        if (isWatching) {
            const context = await esbuild.context(options);
            await context.watch();
            console.log('Watching for changes...');
        } else {
            const result = await esbuild.build({
                ...options,
                metafile: true,
            });
            console.log(`Built ${options.outfile}`);
            return result;
        }
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

async function main() {
    ensureDirSync(path.join(BASE_PATH, "dist"));

    const commonOptions = {
        bundle: true,
        sourcemap: true,
        format: 'esm',
        target: ['es2020'],
        logLevel: 'info',
        minify: false,  // No minificamos inicialmente
        preserveSymlinks: true,
        mainFields: ['module', 'main'],
    };

    // Build minified version (browser)
    await build({
        ...commonOptions,
        entryPoints: [path.join(BASE_PATH, "builds/cdn.js")],
        outfile: path.join(BASE_PATH, `dist/${NAME}.min.js`),
        minify: true,
        platform: "browser",
        format: 'esm',
        define: { CDN: '"true"' },
        treeShaking: true,   // Activamos tree shaking para optimizar bundle size
        keepNames: false,     // Permitimos minificación de nombres para menor tamaño
    });

    // Build SSR version (Node.js)
    await build({
        ...commonOptions,
        entryPoints: [path.join(BASE_PATH, "builds/ssr.js")],
        outfile: path.join(BASE_PATH, `dist/${NAME}-ssr.js`),
        minify: true,
        platform: "node",
        format: 'esm',
        external: [],  // Bundle everything for SSR
        treeShaking: true,
        keepNames: false,
    });

    // Log the contents after build
    const minFile = path.join(BASE_PATH, `dist/${NAME}.min.js`);
    const ssrFile = path.join(BASE_PATH, `dist/${NAME}-ssr.js`);

    if (fs.existsSync(minFile)) {
        console.log('✓ Browser bundle generated successfully');
        fs.readFileSync(minFile, 'utf-8');
    }

    if (fs.existsSync(ssrFile)) {
        console.log('✓ SSR bundle generated successfully');
    }

    console.log('\nBundle sizes:');
    console.log('Browser bundle:');
    outputSize(minFile);
    console.log('SSR bundle:');
    outputSize(ssrFile);
}

main().catch((error) => {
    console.error("An error occurred:", error);
    process.exit(1);
});
