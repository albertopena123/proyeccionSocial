#!/usr/bin/env node

/**
 * Script para limpiar y reiniciar el entorno de desarrollo
 * Uso: npm run clean:restart
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Iniciando limpieza del proyecto...\n');

// Función para ejecutar comandos
function runCommand(command, description) {
  console.log(`📌 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completado\n`);
  } catch (error) {
    console.log(`⚠️ ${description} falló (puede ser normal)\n`);
  }
}

// Función para eliminar directorio
function removeDir(dir) {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`🗑️ Eliminando ${dir}...`);
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`✅ ${dir} eliminado\n`);
  }
}

// 1. Detener procesos
runCommand('taskkill /F /IM node.exe 2>nul || pkill -f node 2>/dev/null || true', 'Deteniendo procesos Node.js');

// 2. Limpiar directorios
console.log('🗂️ Limpiando directorios de caché...\n');
removeDir('.next');
removeDir('node_modules/.cache');
removeDir('.swc');

// 3. Limpiar caché de npm
runCommand('npm cache clean --force', 'Limpiando caché de npm');

// 4. Reinstalar dependencias (opcional)
const args = process.argv.slice(2);
if (args.includes('--reinstall')) {
  console.log('📦 Reinstalando dependencias...\n');
  removeDir('node_modules');
  runCommand('npm install', 'Instalando dependencias');
}

// 5. Regenerar Prisma Client
runCommand('npx prisma generate', 'Regenerando Prisma Client');

console.log('\n✨ Limpieza completada!');
console.log('📝 Puedes iniciar el servidor con: npm run dev\n');