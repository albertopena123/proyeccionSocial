// scripts/migrate-all-constancias.js
// Script modificado para cargar TODOS los registros, generando números únicos para duplicados

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

// Inicializar Prisma
const prisma = new PrismaClient();

// Configuración
const CONFIG = {
  // Rutas de los archivos descargados de Firebase
  csvPath: './firestore-backups/constancy-*.csv', // Archivo de constancias
  storagePath: './storage-backups/', // Carpeta donde están los archivos descargados
  
  // Configuración de destino para archivos
  uploadDestination: './public/uploads/constancias/', // Donde guardar los archivos en Next.js
  publicUrlBase: '/uploads/constancias/', // URL pública base
  
  // Usuario por defecto para migración
  defaultUserId: null, // Se creará o buscará durante la migración
  
  // Opciones de migración
  batchSize: 10, // Procesar de a 10 registros
  dryRun: true, // Si es true, solo simula sin guardar
  fieldsPrinted: false, // Para debug de campos
};

// ==================== UTILIDADES ====================

// Función para leer CSV
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Función para crear índice de archivos (más eficiente)
function createFileIndex(dir, index = {}) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Indexar recursivamente subdirectorios
      createFileIndex(fullPath, index);
    } else {
      // Usar el nombre del archivo como clave (en minúsculas para búsqueda case-insensitive)
      index[file.toLowerCase()] = fullPath;
      // También guardar con el nombre original
      index[file] = fullPath;
    }
  }
  
  return index;
}

// Función para copiar archivo
async function copyFile(source, destination) {
  try {
    // Crear directorio si no existe
    const dir = path.dirname(destination);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Copiar archivo
    fs.copyFileSync(source, destination);
    
    // Obtener información del archivo
    const stats = fs.statSync(destination);
    return {
      size: stats.size,
      exists: true
    };
  } catch (error) {
    console.error(`Error copiando archivo: ${error.message}`);
    return { exists: false, size: 0 };
  }
}

// Función para obtener o crear usuario de migración
async function getOrCreateMigrationUser() {
  // Buscar usuario existente
  let user = await prisma.user.findFirst({
    where: {
      email: 'migracion-completa@proyeccion-social.edu.pe'
    }
  });
  
  if (!user) {
    // Crear usuario de migración
    user = await prisma.user.create({
      data: {
        email: 'migracion-completa@proyeccion-social.edu.pe',
        name: 'Usuario de Migración Completa Firebase',
        role: 'ADMIN',
        isActive: true,
        emailVerified: new Date(),
      }
    });
    console.log('✅ Usuario de migración creado:', user.id);
  } else {
    console.log('✅ Usuario de migración encontrado:', user.id);
  }
  
  return user.id;
}

// Función para generar número de constancia único
async function generateUniqueConstanciaNumber(baseNumber, index = 0) {
  // Si no hay número base, generar uno basado en timestamp
  if (!baseNumber) {
    baseNumber = `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  
  // Si es el primer intento, usar el número original
  let newNumber = index === 0 ? baseNumber : `${baseNumber}-${index}`;
  
  if (!CONFIG.dryRun) {
    // Verificar si existe en la base de datos
    const exists = await prisma.constancia.findUnique({
      where: { constanciaNumber: newNumber }
    });
    
    if (exists) {
      // Si existe, intentar con el siguiente índice
      return generateUniqueConstanciaNumber(baseNumber, index + 1);
    }
  }
  
  return newNumber;
}

// Función para mapear datos de Firebase a Prisma
function mapConstanciaData(firebaseData, userId, uniqueConstanciaNumber) {
  // Mapeo exacto según los headers de tu CSV
  return {
    // Datos del estudiante
    studentCode: firebaseData.code || '', // Campo [2] code
    fullName: firebaseData.fullName || '', // Campo [4] fullName
    dni: firebaseData.dni || '', // Campo [12] dni
    
    // Datos del documento - USAR EL NÚMERO ÚNICO GENERADO
    constanciaNumber: uniqueConstanciaNumber, // Número único generado
    year: parseInt(firebaseData.year) || new Date().getFullYear(), // Campo [3] year
    observation: firebaseData.observe || null, // Campo [6] observe
    
    // Estado y tipo
    status: 'APROBADO', // Por defecto APROBADO ya que tienen URL
    type: 'CONSTANCIA',
    
    // Usuario que creó (usaremos el usuario de migración)
    createdById: userId,
    
    // Fechas - convertir timestamps de Firebase
    createdAt: parseDate(firebaseData.date_register), // Campo [7] date_register
    updatedAt: firebaseData.date_modified ? parseDate(firebaseData.date_modified) : parseDate(firebaseData.date_register),
  };
}

// Función helper para parsear fechas de Firebase
function parseDate(dateValue) {
  if (!dateValue || dateValue === '(vacío)' || dateValue === '') {
    return new Date();
  }
  
  // Firebase timestamps son números en milisegundos
  if (typeof dateValue === 'string' && /^\d+$/.test(dateValue)) {
    return new Date(parseInt(dateValue));
  }
  
  if (typeof dateValue === 'number') {
    return new Date(dateValue);
  }
  
  // Intentar parsear como fecha string
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Función para extraer el nombre del archivo de la URL de Firebase Storage
function extractFileNameFromUrl(url) {
  if (!url) return null;
  
  // URL típica: https://firebasestorage.googleapis.com/v0/b/proyecto/o/constancias%2Farchivo.pdf?alt=media&token=xxx
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Extraer la parte después de /o/
    const match = path.match(/\/o\/(.+?)(\?|$)/);
    if (match && match[1]) {
      // Decodificar el nombre del archivo (Firebase codifica los espacios como %20, etc)
      const fileName = decodeURIComponent(match[1]);
      // Obtener solo el nombre del archivo si tiene carpetas
      return fileName.split('/').pop();
    }
  } catch (error) {
    console.log(`   ⚠️  No se pudo extraer nombre del archivo de: ${url}`);
  }
  
  return null;
}

// ==================== PROCESO DE MIGRACIÓN MEJORADO ====================

async function migrateAllConstancias() {
  console.log('🚀 INICIANDO MIGRACIÓN COMPLETA DE CONSTANCIAS');
  console.log('=====================================');
  console.log(`📁 CSV: ${CONFIG.csvPath}`);
  console.log(`📁 Storage: ${CONFIG.storagePath}`);
  console.log(`🔧 Modo: ${CONFIG.dryRun ? 'SIMULACIÓN' : 'REAL'}`);
  console.log('⚡ CARGARÁ TODOS LOS REGISTROS (generando números únicos para duplicados)');
  console.log('=====================================\n');
  
  try {
    // 1. Obtener usuario de migración
    if (!CONFIG.dryRun) {
      CONFIG.defaultUserId = await getOrCreateMigrationUser();
    } else {
      CONFIG.defaultUserId = 'dry-run-user-id';
      console.log('🔍 Modo simulación - Usuario ID ficticio');
    }
    
    // 2. Buscar archivo CSV
    const csvFiles = fs.readdirSync('./firestore-backups/')
      .filter(file => (file.includes('constancy') || file.includes('constancia')) && file.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      throw new Error('No se encontró archivo CSV de constancias');
    }
    
    const csvPath = path.join('./firestore-backups/', csvFiles[0]);
    console.log(`📄 Archivo CSV encontrado: ${csvFiles[0]}\n`);
    
    // 3. Leer datos del CSV
    console.log('📖 Leyendo datos del CSV...');
    const constanciasData = await readCSV(csvPath);
    console.log(`✅ ${constanciasData.length} registros encontrados\n`);
    
    // 3.5 Crear índice de archivos para búsqueda eficiente
    console.log('🗂️ Creando índice de archivos en storage-backups...');
    const fileIndex = createFileIndex(CONFIG.storagePath);
    const totalFiles = Object.keys(fileIndex).length / 2; // Dividido por 2 porque guardamos cada archivo dos veces
    console.log(`✅ ${totalFiles} archivos indexados\n`);
    
    // 3.6 Analizar duplicados en el CSV
    console.log('🔍 Analizando duplicados en el CSV...');
    const numConstancyCount = {};
    constanciasData.forEach(record => {
      const num = record.num_constancy || record._id;
      if (num) {
        numConstancyCount[num] = (numConstancyCount[num] || 0) + 1;
      }
    });
    
    const duplicados = Object.entries(numConstancyCount)
      .filter(([num, count]) => count > 1)
      .map(([num, count]) => ({ num, count }));
    
    console.log(`📊 Números de constancia únicos: ${Object.keys(numConstancyCount).length}`);
    console.log(`🔄 Números duplicados: ${duplicados.length}`);
    if (duplicados.length > 0) {
      console.log('   Ejemplos de duplicados:');
      duplicados.slice(0, 5).forEach(d => {
        console.log(`   - ${d.num}: aparece ${d.count} veces`);
      });
    }
    console.log('');
    
    // 4. Procesar en lotes
    const batches = [];
    for (let i = 0; i < constanciasData.length; i += CONFIG.batchSize) {
      batches.push(constanciasData.slice(i, i + CONFIG.batchSize));
    }
    
    console.log(`📦 Procesando en ${batches.length} lotes de ${CONFIG.batchSize} registros`);
    console.log(`🔑 Se generarán números únicos para TODOS los registros\n`);
    
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalDuplicatesHandled = 0;
    let totalWithFiles = 0;
    let totalFilesFound = 0;
    
    // Track de números ya usados en esta sesión
    const usedNumbers = new Set();
    
    // 5. Procesar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Lote ${batchIndex + 1}/${batches.length}:`);
      console.log('------------------------');
      
      for (const record of batch) {
        totalProcessed++;
        
        try {
          // Generar número de constancia único
          const baseNumber = record.num_constancy || record._id || `GEN-${totalProcessed}`;
          let uniqueNumber = await generateUniqueConstanciaNumber(baseNumber);
          
          // Si el número ya fue usado en esta sesión, generar uno diferente
          if (usedNumbers.has(uniqueNumber)) {
            totalDuplicatesHandled++;
            uniqueNumber = await generateUniqueConstanciaNumber(baseNumber, 1);
            console.log(`   🔄 Duplicado detectado: ${baseNumber} → ${uniqueNumber}`);
          }
          
          usedNumbers.add(uniqueNumber);
          
          // Mapear datos con el número único
          const constanciaData = mapConstanciaData(record, CONFIG.defaultUserId, uniqueNumber);
          
          // Procesar archivo si existe URL de Firebase Storage
          if (record.url_constancy && record.url_constancy !== '(vacío)' && record.url_constancy !== '') {
            totalWithFiles++;
            const fileName = extractFileNameFromUrl(record.url_constancy);
            
            if (fileName) {
              // Buscar el archivo en el índice (mucho más rápido)
              const foundPath = fileIndex[fileName] || fileIndex[fileName.toLowerCase()];
              
              if (foundPath) {
                totalFilesFound++;
                const destPath = path.join(CONFIG.uploadDestination, fileName);
                
                if (!CONFIG.dryRun) {
                  const fileInfo = await copyFile(foundPath, destPath);
                  if (fileInfo.exists) {
                    constanciaData.fileName = fileName;
                    constanciaData.fileUrl = CONFIG.publicUrlBase + fileName;
                    constanciaData.fileSize = fileInfo.size;
                    constanciaData.fileMimeType = getMimeType(fileName);
                    console.log(`   📎 Archivo copiado: ${fileName}`);
                  }
                } else {
                  console.log(`   📎 [SIMULACIÓN] Archivo encontrado: ${fileName}`);
                  constanciaData.fileName = fileName;
                  constanciaData.fileUrl = CONFIG.publicUrlBase + fileName;
                }
              } else {
                // Guardar la URL original de Firebase si no encontramos el archivo local
                constanciaData.fileUrl = record.url_constancy;
                constanciaData.fileName = fileName;
                console.log(`   ⚠️  Archivo no encontrado localmente: ${fileName}`);
              }
            }
          }
          
          // Guardar en base de datos
          if (!CONFIG.dryRun) {
            const created = await prisma.constancia.create({
              data: constanciaData
            });
            console.log(`✅ [${totalProcessed}/${constanciasData.length}] Constancia ${created.constanciaNumber} migrada - ${constanciaData.fullName}`);
          } else {
            console.log(`✅ [SIMULACIÓN ${totalProcessed}/${constanciasData.length}] Constancia ${constanciaData.constanciaNumber} lista`);
            console.log(`   Datos:`, {
              código: constanciaData.studentCode,
              nombre: constanciaData.fullName,
              dni: constanciaData.dni,
              año: constanciaData.year,
              numOriginal: record.num_constancy,
              numNuevo: uniqueNumber
            });
          }
          
          totalSuccess++;
          
        } catch (error) {
          console.error(`❌ Error procesando registro ${totalProcessed}:`, error.message);
          totalErrors++;
        }
      }
      
      // Pausa entre lotes (solo si no es el último)
      if (batchIndex < batches.length - 1 && !CONFIG.dryRun) {
        console.log('\n⏳ Pausa entre lotes...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 6. Resumen final
    console.log('\n=====================================');
    console.log('📊 RESUMEN DE MIGRACIÓN COMPLETA');
    console.log('=====================================');
    console.log(`📄 Total en CSV: ${constanciasData.length}`);
    console.log(`✅ Insertados exitosamente: ${totalSuccess}`);
    console.log(`🔄 Duplicados manejados: ${totalDuplicatesHandled}`);
    console.log(`❌ Errores: ${totalErrors}`);
    console.log('\n📎 ARCHIVOS:');
    console.log(`   Constancias con URL: ${totalWithFiles}`);
    console.log(`   Archivos encontrados: ${totalFilesFound}`);
    console.log(`   Archivos no encontrados: ${totalWithFiles - totalFilesFound}`);
    console.log('=====================================');
    
    if (CONFIG.dryRun) {
      console.log('\n⚠️  MODO SIMULACIÓN - No se guardaron cambios');
      console.log('📌 Para ejecutar la migración real, ejecuta:');
      console.log('    node scripts/migrate-all-constancias.js --execute');
    } else {
      console.log('\n✅ MIGRACIÓN COMPLETA EXITOSA');
      console.log(`🎉 Se insertaron TODOS los ${totalSuccess} registros del CSV`);
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal en la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función auxiliar para obtener MIME type
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// ==================== VERIFICACIÓN DE MIGRACIÓN ====================

async function verifyMigration() {
  console.log('\n🔍 VERIFICANDO MIGRACIÓN COMPLETA');
  console.log('=====================================');
  
  const stats = await prisma.constancia.groupBy({
    by: ['status'],
    _count: true,
  });
  
  console.log('\n📊 Constancias por estado:');
  stats.forEach(stat => {
    console.log(`   ${stat.status}: ${stat._count}`);
  });
  
  const total = await prisma.constancia.count();
  console.log(`\n📄 Total de constancias en DB: ${total}`);
  
  const withFiles = await prisma.constancia.count({
    where: {
      fileUrl: { not: null }
    }
  });
  console.log(`📎 Constancias con archivos: ${withFiles}`);
  
  // Verificar usuarios de migración
  const migrationUsers = await prisma.constancia.groupBy({
    by: ['createdById'],
    _count: true,
  });
  
  console.log(`\n👤 Constancias por usuario creador:`);
  for (const user of migrationUsers) {
    const userData = await prisma.user.findUnique({
      where: { id: user.createdById },
      select: { email: true }
    });
    console.log(`   ${userData?.email || user.createdById}: ${user._count} constancias`);
  }
  
  // Verificar últimas constancias insertadas
  const latest = await prisma.constancia.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      constanciaNumber: true,
      fullName: true,
      createdAt: true
    }
  });
  
  console.log(`\n📅 Últimas 5 constancias insertadas:`);
  latest.forEach(c => {
    console.log(`   ${c.constanciaNumber}: ${c.fullName} (${c.createdAt.toLocaleDateString()})`);
  });
}

// ==================== EJECUTAR MIGRACIÓN ====================

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const shouldVerify = args.includes('--verify');

if (shouldVerify) {
  // Solo verificar
  verifyMigration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  // Configurar modo
  CONFIG.dryRun = isDryRun;
  
  // Ejecutar migración
  migrateAllConstancias()
    .then(() => {
      if (!isDryRun) {
        return verifyMigration();
      }
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}