import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox';
  const manifestVersion = isFirefox ? 'v2' : 'v3';
  const outDir = isFirefox ? 'dist-firefox' : 'dist-chrome';

  return {
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          'background/index': resolve(__dirname, 'src/background/index.ts'),
          'popup/index': resolve(__dirname, 'src/popup/index.ts'),
          'options/index': resolve(__dirname, 'src/options/index.ts'),
          'blocked/index': resolve(__dirname, 'src/blocked/index.ts'),
          'content/index': resolve(__dirname, 'src/content/index.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'shared/[name].js',
        },
      },
    },
    plugins: [
      {
        name: 'copy-extension-assets',
        closeBundle: async () => {
          const ensureDir = (dir) => {
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
          };

          ensureDir(resolve(__dirname, outDir));

          // Copy manifest
          const manifestPath = resolve(__dirname, `src/manifest.${manifestVersion}.json`);
          if (fs.existsSync(manifestPath)) {
            fs.copyFileSync(manifestPath, resolve(__dirname, `${outDir}/manifest.json`));
          } else {
            console.error(`Manifest file not found: ${manifestPath}`);
          }

          // Copy HTML files
          const htmlFiles = [
            { src: 'popup/popup.html', dest: 'popup/popup.html' },
            { src: 'options/options.html', dest: 'options/options.html' },
            { src: 'blocked/blocked.html', dest: 'blocked/blocked.html' },
          ];

          htmlFiles.forEach(({ src, dest }) => {
            const srcPath = resolve(__dirname, `src/${src}`);
            const destPath = resolve(__dirname, `${outDir}/${dest}`);
            const destDir = resolve(__dirname, `${outDir}/${dest.split('/')[0]}`);

            ensureDir(destDir);

            if (fs.existsSync(srcPath)) {
              fs.copyFileSync(srcPath, destPath);
            } else {
              console.warn(`HTML file not found: ${srcPath}`);
            }
          });

          // Copy icons
          const iconDir = resolve(__dirname, 'src/icons');
          if (fs.existsSync(iconDir)) {
            ensureDir(resolve(__dirname, `${outDir}/icons`));
            fs.readdirSync(iconDir).forEach((file) => {
              fs.copyFileSync(
                resolve(__dirname, `src/icons/${file}`),
                resolve(__dirname, `${outDir}/icons/${file}`)
              );
            });
          }

          // Copy _locales recursively
          const copyDir = (src, dest) => {
            ensureDir(dest);
            fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
              const srcPath = resolve(src, entry.name);
              const destPath = resolve(dest, entry.name);
              if (entry.isDirectory()) {
                copyDir(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            });
          };

          const localesDir = resolve(__dirname, 'src/_locales');
          if (fs.existsSync(localesDir)) {
            copyDir(localesDir, resolve(__dirname, `${outDir}/_locales`));
          }
        },
      },
    ],
  };
});
