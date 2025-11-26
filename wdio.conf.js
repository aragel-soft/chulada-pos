import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

let tauriDriver;
let exit = false;

export const config = {
  host: '127.0.0.1',
  port: 4444,
  
  specs: ['./test/e2e/**/*.spec.js'],
  
  maxInstances: 1,
  
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: './src-tauri/target/debug/chulada-pos.exe', 
      },
    },
  ],
  
  reporters: ['spec'],
  
  framework: 'mocha',
  
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  
  onPrepare: () => {
    console.log('🔨 Compilando aplicación Tauri...');
    spawnSync(
      'npm',
      ['run', 'tauri', 'build', '--', '--debug'],
      {
        cwd: path.resolve(__dirname),
        stdio: 'inherit',
        shell: true,
      }
    );
  },
  
  beforeSession: () => {
    console.log('🚗 Iniciando tauri-driver...');
    const driverPath = path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver.exe');
    
    tauriDriver = spawn(driverPath, [], { 
      stdio: [null, process.stdout, process.stderr] 
    });
    
    
    tauriDriver.on('error', (error) => {
      console.error('❌ tauri-driver error:', error);
      process.exit(1);
    });
    
    tauriDriver.on('exit', (code) => {
      if (!exit) {
        console.error('❌ tauri-driver exited with code:', code);
        process.exit(1);
      }
    });
  },
  
  afterSession: () => {
    closeTauriDriver();
  },
};

function closeTauriDriver() {
  exit = true;
  tauriDriver?.kill();
}

function onShutdown(fn) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };
  
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);
  process.on('SIGBREAK', cleanup);
}

onShutdown(() => {
  closeTauriDriver();
});