#!/usr/bin/env node

/**
 * Script para detener TODOS los servidores Next.js en ejecución
 */

const { execSync } = require('child_process');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function stopAllServers() {
  log('\n🛑 Deteniendo todos los servidores Next.js...', 'cyan');
  
  const ports = [3000, 3001, 3002, 3003, 3004, 3005];
  let stopped = 0;
  
  if (process.platform === 'win32') {
    // Windows - buscar todos los procesos node.exe
    try {
      // Primero intentar detener por puertos
      ports.forEach(port => {
        try {
          const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
          const lines = output.split('\n');
          
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5 && parts[1].includes(`:${port}`) && parts[3] === 'LISTENING') {
              const pid = parts[parts.length - 1];
              if (pid && pid !== '0') {
                try {
                  log(`  Deteniendo proceso PID ${pid} en puerto ${port}`, 'yellow');
                  execSync(`taskkill //F //PID ${pid}`, { stdio: 'ignore' });
                  stopped++;
                } catch (e) {
                  // Ignorar si ya está detenido
                }
              }
            }
          });
        } catch (e) {
          // No hay proceso en ese puerto
        }
      });
      
      // También buscar procesos node.exe que contengan "next"
      try {
        const nodeProcesses = execSync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine', { encoding: 'utf8' });
        const lines = nodeProcesses.split('\n');
        
        lines.forEach(line => {
          if (line.includes('next') || line.includes('npm') || line.includes('dev')) {
            const match = line.match(/\s+(\d+)\s*$/);
            if (match) {
              const pid = match[1];
              try {
                log(`  Deteniendo proceso Next.js PID ${pid}`, 'yellow');
                execSync(`taskkill //F //PID ${pid}`, { stdio: 'ignore' });
                stopped++;
              } catch (e) {
                // Ignorar si ya está detenido
              }
            }
          }
        });
      } catch (e) {
        // Ignorar errores de wmic
      }
      
    } catch (error) {
      log('  No se encontraron servidores activos', 'yellow');
    }
  } else {
    // Linux/Mac
    ports.forEach(port => {
      try {
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
        stopped++;
      } catch (e) {
        // No hay proceso en ese puerto
      }
    });
    
    // También buscar procesos next
    try {
      execSync('pkill -f "next dev"', { stdio: 'ignore' });
    } catch (e) {
      // No hay procesos next
    }
  }
  
  if (stopped > 0) {
    log(`\n✅ ${stopped} servidor(es) detenido(s)`, 'green');
  } else {
    log('\n📝 No se encontraron servidores activos', 'yellow');
  }
  
  // Verificar qué puertos quedaron ocupados
  log('\n🔍 Verificando puertos...', 'cyan');
  let portsInUse = [];
  
  ports.forEach(port => {
    try {
      if (process.platform === 'win32') {
        const output = execSync(`netstat -an | findstr :${port}`, { encoding: 'utf8' });
        if (output.includes('LISTENING')) {
          portsInUse.push(port);
        }
      } else {
        execSync(`lsof -ti:${port}`, { stdio: 'ignore' });
        portsInUse.push(port);
      }
    } catch (e) {
      // Puerto libre
    }
  });
  
  if (portsInUse.length > 0) {
    log(`  ⚠️ Puertos aún en uso: ${portsInUse.join(', ')}`, 'yellow');
    log('  Intenta ejecutar este script nuevamente si es necesario', 'yellow');
  } else {
    log('  ✅ Todos los puertos están libres', 'green');
  }
  
  log('\n✨ Limpieza completada\n', 'green');
}

// Ejecutar
try {
  stopAllServers();
} catch (error) {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
}