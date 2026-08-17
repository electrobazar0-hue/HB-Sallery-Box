const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const staging = path.join(__dirname, '..', 'staging_deploy');
if (fs.existsSync(staging)) {
  fs.rmSync(staging, { recursive: true, force: true });
}
fs.mkdirSync(staging);

const itemsToCopy = [
  'src',
  'public',
  'prisma',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config.ts',
  'tailwind.config.ts',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'server.js',
  'ecosystem.config.js',
  '.htaccess',
  'deploy.sh',
  'components.json',
];

for (const item of itemsToCopy) {
  const src = path.join(__dirname, '..', item);
  const dest = path.join(staging, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, {
      recursive: true,
      filter: (srcPath) => !srcPath.endsWith('dev.db') && !srcPath.includes('dev.db-journal'),
    });
  }
}

const zipTarget = path.join(__dirname, '..', 'HB-SALLERY-BOX-DEPLOY.zip');
if (fs.existsSync(zipTarget)) {
  fs.unlinkSync(zipTarget);
}

execSync(`powershell -Command "Compress-Archive -Path '${staging}\\*' -DestinationPath '${zipTarget}' -Force"`);
fs.rmSync(staging, { recursive: true, force: true });

console.log('Successfully created:', zipTarget);
const stats = fs.statSync(zipTarget);
console.log('Size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
