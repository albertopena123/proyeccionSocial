// scripts/prepare-migration.js
// Script para preparar el entorno antes de la migración

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.cyan}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
  };
  console.log(`${prefix[type]} ${message}`);
}

async function checkEnvironment() {
  console.log(`\n${colors.bright}🔍 VERIFICACIÓN DEL ENTORNO${colors.reset}`);
  console.log('═'.repeat(40));
  
  const checks = {
    database: false,
    firebaseBackup: false,
    csvFiles: false,
    storageFiles: false,
    uploadDir: false,
  };
  
  // 1. Verificar conexión a base de datos
  try {
    await prisma.$connect();
    log('Conexión a PostgreSQL exitosa', 'success');
    checks.database = true;
    
    // Verificar si las tablas existen
    const constanciaCount = await prisma.constancia.count();
    log(`Tabla 'constancia' encontrada (${constanciaCount} registros actuales)`, 'info');
  } catch (error) {
    log(`Error conectando a la base de datos: ${error.message}`, 'error');
    log('Asegúrate de:', 'warning');
    log('  1. PostgreSQL está ejecutándose', 'info');
    log('  2. Las credenciales en .env son correctas', 'info');
    log('  3. Has ejecutado: npx prisma migrate dev', 'info');
  }
  
  // 2. Verificar archivos de Firebase
  const firebaseBackupPath = './firestore-backups';
  const storageBackupPath = './storage-backups';
  
  // Buscar archivos CSV en ambas carpetas
  let csvFiles = [];
  let csvLocation = '';
  
  if (fs.existsSync(firebaseBackupPath)) {
    log('Carpeta firestore-backups encontrada', 'success');
    checks.firebaseBackup = true;
    
    // Buscar archivos CSV en firestore-backups
    csvFiles = fs.readdirSync(firebaseBackupPath)
      .filter(file => file.endsWith('.csv'));
    
    if (csvFiles.length > 0) {
      csvLocation = firebaseBackupPath;
    }
  }
  
  // Si no hay CSV en firestore-backups, buscar en storage-backups
  if (csvFiles.length === 0 && fs.existsSync(storageBackupPath)) {
    log('Buscando CSV en storage-backups...', 'info');
    csvFiles = fs.readdirSync(storageBackupPath)
      .filter(file => file.endsWith('.csv'));
    
    if (csvFiles.length > 0) {
      csvLocation = storageBackupPath;
      log(`⚠️  CSV encontrado en ${storageBackupPath} (debería estar en firestore-backups)`, 'warning');
    }
  }
  
  if (csvFiles.length > 0) {
    log(`${csvFiles.length} archivos CSV encontrados en ${csvLocation}:`, 'success');
    csvFiles.forEach(file => {
      const stats = fs.statSync(path.join(csvLocation, file));
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      log(`  - ${file} (${sizeMB} MB)`, 'info');
    });
    checks.csvFiles = true;
    
    // Buscar específicamente constancy o docs_announcements
    const constanciasCSV = csvFiles.find(f => 
      f.includes('constancy') || 
      f.includes('constancia') || 
      f.includes('docs_announcements')
    );
    
    if (constanciasCSV) {
      log(`✅ Archivo de constancias encontrado: ${constanciasCSV}`, 'success');
    } else {
      log('No se encontró archivo CSV de constancias', 'warning');
    }
  } else {
    log('No se encontraron archivos CSV en ninguna carpeta', 'error');
    log('Verifica que hayas exportado los datos de Firebase correctamente', 'warning');
  }
  
  // 3. Verificar archivos de Storage
  if (fs.existsSync(storageBackupPath)) {
    log('Carpeta storage-backups encontrada', 'success');
    checks.storageFiles = true;
    
    // Contar archivos
    const countFiles = (dir) => {
      let count = 0;
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          count += countFiles(fullPath);
        } else {
          count++;
        }
      });
      return count;
    };
    
    const totalFiles = countFiles(storageBackupPath);
    log(`${totalFiles} archivos en Storage`, 'info');
  } else {
    log('Carpeta storage-backups NO encontrada', 'warning');
    log('Los archivos adjuntos no se migrarán', 'info');
  }
  
  // 4. Crear directorio de uploads si no existe
  const uploadPath = './public/uploads/constancias';
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    log(`Directorio de uploads creado: ${uploadPath}`, 'success');
  } else {
    log('Directorio de uploads ya existe', 'info');
  }
  checks.uploadDir = true;
  
  // 5. Resumen
  console.log(`\n${colors.bright}📊 RESUMEN${colors.reset}`);
  console.log('═'.repeat(40));
  
  const allChecks = Object.values(checks).every(check => check);
  
  if (allChecks) {
    log('✅ TODO LISTO PARA LA MIGRACIÓN', 'success');
    console.log('\nPróximos pasos:');
    console.log('1. Ejecuta simulación: npm run migrate:constancias:dry');
    console.log('2. Revisa los resultados');
    console.log('3. Ejecuta migración real: npm run migrate:constancias:execute');
  } else {
    log('⚠️ HAY PROBLEMAS QUE RESOLVER', 'warning');
    console.log('\nRevisa los errores arriba y:');
    console.log('1. Asegúrate de tener los backups de Firebase');
    console.log('2. Verifica la conexión a PostgreSQL');
    console.log('3. Ejecuta las migraciones de Prisma');
  }
  
  await prisma.$disconnect();
}

// Función para mostrar ejemplo de CSV
async function showCSVSample() {
  console.log(`\n${colors.bright}📄 MUESTRA DE DATOS CSV${colors.reset}`);
  console.log('═'.repeat(40));
  
  try {
    // Buscar archivo CSV de constancias
    const csvPath = './firestore-backups/constancy-2025-01-30.csv';
    
    if (!fs.existsSync(csvPath)) {
      log('No se encontró el archivo constancy-2025-01-30.csv', 'error');
      return;
    }
    
    log(`Analizando: ${csvPath}`, 'info');
    
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    
    if (lines.length === 0) {
      log('El archivo CSV está vacío', 'error');
      return;
    }
    
    // Mostrar headers
    console.log(`\n${colors.cyan}HEADERS DEL CSV:${colors.reset}`);
    console.log('─'.repeat(40));
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    headers.forEach((header, i) => {
      console.log(`  [${i}] ${header}`);
    });
    
    // Mostrar primera fila de datos
    if (lines.length > 1 && lines[1].trim()) {
      console.log(`\n${colors.cyan}PRIMERA FILA DE DATOS:${colors.reset}`);
      console.log('─'.repeat(40));
      
      const values = lines[1].split(',').map(v => v.trim().replace(/"/g, ''));
      headers.forEach((header, i) => {
        const value = values[i] || '(vacío)';
        const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
        console.log(`  ${header}: ${displayValue}`);
      });
    }
    
    // Estadísticas
    console.log(`\n${colors.cyan}ESTADÍSTICAS:${colors.reset}`);
    console.log('─'.repeat(40));
    console.log(`  Total de filas: ${lines.length - 1} (sin contar headers)`);
    console.log(`  Total de columnas: ${headers.length}`);
    
    log('\n⚠️  IMPORTANTE: Verifica que estos campos coincidan con el mapeo en migrate-constancias.js', 'warning');
    
  } catch (error) {
    log(`Error leyendo CSV: ${error.message}`, 'error');
    console.error(error);
  }
}

// Ejecutar verificaciones
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   PREPARACIÓN PARA MIGRACIÓN         ║');
  console.log('║   Firebase → PostgreSQL               ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(colors.reset);
  
  await checkEnvironment();
  await showCSVSample();
  
  console.log(`\n${colors.bright}💡 TIPS:${colors.reset}`);
  console.log('• La migración es incremental (no duplica registros)');
  console.log('• Primero ejecuta en modo simulación (dry-run)');
  console.log('• Revisa los logs antes de ejecutar la migración real');
  console.log('• Los archivos se copiarán a public/uploads/constancias/');
  console.log('• Haz un backup de tu base de datos antes de migrar');
}

main().catch(console.error);