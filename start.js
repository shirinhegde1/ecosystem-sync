const { spawn } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log('       ECOSYSTEM SYNC PLATFORM FOR SMART RINGS & WEARABLES       ');
console.log('                   (100% Docker-Free Architecture)              ');
console.log('================================================================');

const services = [
  {
    name: 'Backend (GraphQL & Storage)',
    cmd: process.execPath,
    args: [path.join(__dirname, 'backend', 'src', 'index.js')],
    cwd: path.join(__dirname, 'backend')
  },
  {
    name: 'Mobile Gateway (SQLite Buffer & Dashboard)',
    cmd: process.execPath,
    args: [path.join(__dirname, 'mobile-gateway', 'src', 'index.js')],
    cwd: path.join(__dirname, 'mobile-gateway')
  },
  {
    name: 'Smart Ring Simulator (Telemetry Generator)',
    cmd: process.execPath,
    args: [path.join(__dirname, 'simulator', 'src', 'index.js')],
    cwd: path.join(__dirname, 'simulator')
  }
];

const processes = [];

services.forEach(svc => {
  console.log(`Starting ${svc.name}...`);
  const proc = spawn(svc.cmd, svc.args, {
    cwd: svc.cwd,
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: path.join(__dirname, 'mobile-gateway', 'node_modules') }
  });

  proc.on('error', (err) => {
    console.error(`Failed to start ${svc.name}:`, err);
  });

  processes.push(proc);
});

setTimeout(() => {
  console.log('\n================================================================');
  console.log('🎉 ALL SERVICES ARE UP AND RUNNING!');
  console.log('✨ Live Web Dashboard:   http://localhost:3000');
  console.log('✨ Gateway /data Queue:  http://localhost:3000/data');
  console.log('✨ GraphQL API Explorer: http://localhost:4000/graphql');
  console.log('✨ Backend Health Check: http://localhost:4000/api/health');
  console.log('----------------------------------------------------------------');
  console.log('💡 Keep this window open. Press Ctrl + C to stop all services.');
  console.log('================================================================\n');
}, 2000);

function cleanup() {
  console.log('\nShutting down all Ecosystem Sync services...');
  processes.forEach(p => p.kill());
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
