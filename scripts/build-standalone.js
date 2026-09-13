const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const appApiDir = path.join(rootDir, 'src', 'app', 'api');
const tempBackupDir = path.join(rootDir, 'src', 'api_temp_backup');
const nextConfigPath = path.join(rootDir, 'next.config.ts');

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function safeRename(src, dest, retries = 10, delayMs = 600) {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        return true;
      }
      return false;
    } catch (e) {
      if (i === retries - 1) throw e;
      sleep(delayMs);
    }
  }
}

console.log('=== BUILDING 100% STANDALONE OFFLINE-FIRST HB-SALLERY-BOX ===');

// Read original next.config.ts
const originalNextConfig = fs.readFileSync(nextConfigPath, 'utf8');

// Prepare export next.config.ts
const exportNextConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
`;

let apiMoved = false;

try {
  // Step 1: Move src/app/api to backup for static export
  if (fs.existsSync(appApiDir)) {
    console.log('[1/5] Isolating server API routes for client static export...');
    safeRename(appApiDir, tempBackupDir);
    apiMoved = true;
  }

  // Step 2: Write export next.config.ts
  console.log('[2/5] Configuring Next.js for full static bundle export...');
  fs.writeFileSync(nextConfigPath, exportNextConfig, 'utf8');

  // Step 3: Run Next.js build
  console.log('[3/5] Compiling Next.js React SPA bundle into out/ directory...');
  execSync('npx.cmd next build', { cwd: rootDir, stdio: 'inherit' });

  // Give Windows 1 second to release background worker locks
  sleep(1200);

  // Step 4: Verify out/index.html
  const outIndexPath = path.join(rootDir, 'out', 'index.html');
  if (fs.existsSync(outIndexPath)) {
    const content = fs.readFileSync(outIndexPath, 'utf8');
    console.log(`[4/5] Verified out/index.html generated successfully (${content.length} bytes)`);
  } else {
    throw new Error('out/index.html was not generated!');
  }

  // Copy public assets to out
  const publicDir = path.join(rootDir, 'public');
  const outDir = path.join(rootDir, 'out');
  const filesToCopy = ['logo.jpg', 'icon-192.png', 'icon-512.png', 'favicon-32.png', 'manifest.json'];
  filesToCopy.forEach(file => {
    const src = path.join(publicDir, file);
    const dest = path.join(outDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });

  console.log('[5/5] Static SPA export completed successfully!');
} catch (err) {
  console.error('❌ Build failed with error:', err.message);
  process.exit(1);
} finally {
  // Always restore original files
  if (apiMoved && fs.existsSync(tempBackupDir)) {
    console.log('Restoring server API routes...');
    try {
      safeRename(tempBackupDir, appApiDir);
    } catch (e) {
      console.warn('Final rename warning:', e.message);
    }
  }
  fs.writeFileSync(nextConfigPath, originalNextConfig, 'utf8');
  console.log('Restored next.config.ts.');
}
