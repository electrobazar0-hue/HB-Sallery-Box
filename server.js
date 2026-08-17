const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const next = require('next');

try {
  console.log('> Ensuring database tables are in sync on boot...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('> Database is ready.');
} catch (e) {
  console.warn('> Database init warning:', e.message);
}

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '10000', 10);
const hostname = '0.0.0.0';

const app = next({ dev, dir: path.resolve(__dirname), hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});
