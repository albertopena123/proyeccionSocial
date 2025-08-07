#!/usr/bin/env node

/**
 * Script para manejar el servidor de desarrollo de forma segura
 * Detiene cualquier instancia previa antes de iniciar una nueva
 */

const { spawn, execSync } = require('child_process');
const readline = require('readline');

const PORT = process.env.PORT || 3000;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para encontrar y matar procesos en un puerto
function killPort(port) {
  try {
    if (process.platform === 'win32') {
      // Windows
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        }
      });
      
      pids.forEach(pid => {
        try {
          log(`  Deteniendo proceso PID ${pid} en puerto ${port}...`, 'yellow');
          execSync(`taskkill //F //PID ${pid}`, { stdio: 'ignore' });
        } catch (e) {
          // Ignorar errores si el proceso ya no existe
        }
      });
      
      if (pids.size > 0) {
        log(`  ✅ ${pids.size} proceso(s) detenido(s)`, 'green');
      }
    } else {
      // Linux/Mac
      try {
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
        log(`  ✅ Proceso en puerto ${port} detenido`, 'green');
      } catch (e) {
        // No hay proceso en ese puerto
      }
    }
  } catch (error) {
    // No hay procesos usando el puerto
  }
}

// Función para limpiar todos los puertos comunes de Next.js
function cleanupPorts() {
  log('\n🧹 Limpiando puertos...', 'cyan');
  const ports = [3000, 3001, 3002, 3003];
  
  ports.forEach(port => {
    killPort(port);
  });
  
  // Esperar un momento para que los puertos se liberen
  return new Promise(resolve => setTimeout(resolve, 1000));
}

// Función principal
async function startDev() {
  log('\n====================================', 'bright');
  log('   Servidor de Desarrollo - UNAMAD', 'bright');
  log('====================================\n', 'bright');
  
  // Limpiar puertos
  await cleanupPorts();
  
  log(`\n🚀 Iniciando servidor en puerto ${PORT}...`, 'blue');
  
  // Iniciar Next.js directamente sin llamar a npm run dev para evitar loops
  const nextProcess = spawn('npx', ['next', 'dev', '--port', PORT], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
  });
  
  // Manejar cierre graceful
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  process.on('SIGINT', () => {
    log('\n\n⏹️  Deteniendo servidor...', 'yellow');
    nextProcess.kill('SIGTERM');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
  
  process.on('SIGTERM', () => {
    nextProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  nextProcess.on('exit', (code) => {
    log(`\n📊 Servidor detenido con código: ${code}`, code === 0 ? 'green' : 'red');
    process.exit(code);
  });
}

// Ejecutar
startDev().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});