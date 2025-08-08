// scripts/migrate-resolutions.js
// Script de migración de Resoluciones desde Firebase a PostgreSQL con Prisma

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

// Inicializar Prisma
const prisma = new PrismaClient();

// Configuración
const CONFIG = {
  // Rutas de archivos
  csvPath: './firestore-backups/resolutions-2025-08-08.csv',
  storagePath: './storage-backups/resolutions/', // Carpeta con 146 archivos
  uploadDestination: './public/uploads/resoluciones/',
  publicUrlBase: '/uploads/resoluciones/',
  
  // Usuario por defecto para migración
  defaultUserId: null,
  
  // Opciones de migración
  batchSize: 10,
  dryRun: true, // Cambiar a false para ejecutar de verdad
};

// ==================== MAPEOS ====================

// Mapeo de tipo de resolución
const TIPO_RESOLUCION_MAP = {
  'APROBACION DE PROYECTO PARA EJECUCIÓN': 'APROBACION_PROYECTO',
  'APROBACION DE PROYECTO': 'APROBACION_PROYECTO',
  'APROBACION DE INFORME FINAL': 'APROBACION_INFORME_FINAL',
  'APROBACION INFORME FINAL': 'APROBACION_INFORME_FINAL',
};

// Mapeo de modalidad (números a ENUM)
const MODALIDAD_MAP = {
  '1': 'DOCENTES',
  '2': 'ESTUDIANTES', 
  '3': 'VOLUNTARIADO',
  '4': 'ACTIVIDAD',
  'DOCENTES': 'DOCENTES',
  'ESTUDIANTES': 'ESTUDIANTES',
  'VOLUNTARIADO': 'VOLUNTARIADO',
  'ACTIVIDAD': 'ACTIVIDAD',
};

// ==================== UTILIDADES ====================

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

function createFileIndex(dir) {
  const index = {};
  if (!fs.existsSync(dir)) {
    console.log(`   ⚠️  Directorio no existe: ${dir}`);
    return index;
  }
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      index[file.toLowerCase()] = fullPath;
      index[file] = fullPath;
    }
  });
  
  return index;
}

async function copyFile(source, destination) {
  try {
    const dir = path.dirname(destination);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.copyFileSync(source, destination);
    const stats = fs.statSync(destination);
    return { size: stats.size, exists: true };
  } catch (error) {
    console.error(`   Error copiando archivo: ${error.message}`);
    return { exists: false, size: 0 };
  }
}

async function getOrCreateMigrationUser() {
  let user = await prisma.user.findFirst({
    where: { email: 'migracion-resolutions@proyeccion-social.edu.pe' }
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'migracion-resolutions@proyeccion-social.edu.pe',
        name: 'Usuario de Migración Resoluciones',
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

// Función para parsear fechas
function parseDate(dateValue) {
  if (!dateValue || dateValue === '(vacío)' || dateValue === '') {
    return new Date();
  }
  
  // Si es timestamp de Firebase (milisegundos)
  if (typeof dateValue === 'string' && /^\d+$/.test(dateValue)) {
    return new Date(parseInt(dateValue));
  }
  
  // Si es fecha en formato YYYY-MM-DD o similar
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Función para extraer nombre del archivo de URL
function extractFileNameFromUrl(url) {
  if (!url || url === '(vacío)') return null;
  
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const match = path.match(/\/o\/(.+?)(\?|$)/);
    if (match && match[1]) {
      const fileName = decodeURIComponent(match[1]);
      return fileName.split('/').pop();
    }
  } catch (error) {
    console.log(`   ⚠️  No se pudo extraer nombre del archivo de URL`);
  }
  
  return null;
}

// Función para parsear arrays JSON de participantes
function parseParticipants(jsonString) {
  if (!jsonString || jsonString === '[]' || jsonString === '(vacío)') {
    return [];
  }
  
  try {
    // Intentar parsear como JSON
    const parsed = JSON.parse(jsonString.replace(/;/g, ','));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Si no es JSON válido, intentar extraer datos manualmente
    console.log('   ⚠️  No se pudo parsear participantes como JSON');
    return [];
  }
}

// ==================== MAPEO DE DATOS ====================

function mapResolutionData(firebaseData, userId) {
  // Mapear tipo de resolución
  const tipoOriginal = firebaseData.type_resolution || '';
  const tipoResolucion = TIPO_RESOLUCION_MAP[tipoOriginal] || 'APROBACION_PROYECTO';
  
  // Mapear modalidad
  const modalidadOriginal = String(firebaseData.modality || '1');
  const modalidad = MODALIDAD_MAP[modalidadOriginal] || 'DOCENTES';
  
  // Parsear financiamiento
  const esFinanciado = firebaseData.is_financed === 'true' || firebaseData.is_financed === true;
  const monto = esFinanciado && firebaseData.amount ? parseFloat(firebaseData.amount) : null;
  
  return {
    // Tipo y número
    tipoResolucion,
    numeroResolucion: firebaseData.num_resolution || firebaseData._id || '',
    fechaResolucion: parseDate(firebaseData.date_resolution),
    
    // Modalidad y financiamiento
    modalidad,
    esFinanciado,
    monto,
    
    // Datos del asesor
    dniAsesor: firebaseData.dni_adviser || '',
    nombreAsesor: firebaseData.name_adviser || '',
    
    // Datos del proyecto
    tituloProyecto: firebaseData.title_project || '',
    
    // Facultad y departamento (por ahora usaremos valores por defecto)
    facultadId: parseInt(firebaseData.faculty) || 1, // Usar facultad del CSV o default 1
    departamentoId: parseInt(firebaseData.departament) || 1, // Usar departamento del CSV o default 1
    
    // Estado
    status: 'APROBADO', // Por defecto aprobado
    
    // Usuario que creó
    createdById: userId,
    
    // Fechas
    createdAt: parseDate(firebaseData.date_register_resolution),
    updatedAt: firebaseData.date_modified ? parseDate(firebaseData.date_modified) : new Date(),
  };
}

// ==================== PROCESO DE MIGRACIÓN ====================

async function migrateResolutions() {
  console.log('🚀 INICIANDO MIGRACIÓN DE RESOLUCIONES');
  console.log('=====================================');
  console.log(`📁 CSV: ${CONFIG.csvPath}`);
  console.log(`📁 Storage: ${CONFIG.storagePath}`);
  console.log(`🔧 Modo: ${CONFIG.dryRun ? 'SIMULACIÓN' : 'REAL'}`);
  console.log('=====================================\n');
  
  try {
    // 1. Obtener usuario de migración
    if (!CONFIG.dryRun) {
      CONFIG.defaultUserId = await getOrCreateMigrationUser();
    } else {
      CONFIG.defaultUserId = 'dry-run-user-id';
      console.log('🔍 Modo simulación - Usuario ID ficticio');
    }
    
    // 2. Verificar archivo CSV
    if (!fs.existsSync(CONFIG.csvPath)) {
      throw new Error(`No se encontró archivo CSV: ${CONFIG.csvPath}`);
    }
    console.log(`📄 Archivo CSV encontrado\n`);
    
    // 3. Leer datos del CSV
    console.log('📖 Leyendo datos del CSV...');
    const resolutionsData = await readCSV(CONFIG.csvPath);
    console.log(`✅ ${resolutionsData.length} resoluciones encontradas\n`);
    
    // 4. Crear índice de archivos
    console.log('🗂️ Indexando archivos en storage-backups...');
    const fileIndex = createFileIndex(CONFIG.storagePath);
    const totalFiles = Object.keys(fileIndex).length / 2;
    console.log(`✅ ${totalFiles} archivos indexados\n`);
    
    // 5. Verificar facultades y departamentos existentes
    if (!CONFIG.dryRun) {
      const facultades = await prisma.facultad.findMany();
      const departamentos = await prisma.departamento.findMany();
      console.log(`📊 Facultades en DB: ${facultades.length}`);
      console.log(`📊 Departamentos en DB: ${departamentos.length}\n`);
      
      if (facultades.length === 0) {
        console.log('⚠️  ADVERTENCIA: No hay facultades en la DB');
        console.log('   Se usará facultadId = 1 por defecto\n');
      }
    }
    
    // 6. Procesar en lotes
    const batches = [];
    for (let i = 0; i < resolutionsData.length; i += CONFIG.batchSize) {
      batches.push(resolutionsData.slice(i, i + CONFIG.batchSize));
    }
    
    console.log(`📦 Procesando en ${batches.length} lotes de ${CONFIG.batchSize} registros\n`);
    
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let totalWithFiles = 0;
    let totalFilesFound = 0;
    
    // 7. Procesar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Lote ${batchIndex + 1}/${batches.length}:`);
      console.log('------------------------');
      
      for (const record of batch) {
        totalProcessed++;
        
        try {
          // Verificar si ya existe
          if (!CONFIG.dryRun) {
            const exists = await prisma.resolucion.findUnique({
              where: { numeroResolucion: record.num_resolution }
            });
            
            if (exists) {
              console.log(`⏭️  Resolución ${record.num_resolution} ya existe - SALTANDO`);
              totalSkipped++;
              continue;
            }
          }
          
          // Mapear datos básicos
          const resolutionData = mapResolutionData(record, CONFIG.defaultUserId);
          
          // Procesar archivo de resolución
          if (record.url_file_resolution && record.url_file_resolution !== '(vacío)') {
            totalWithFiles++;
            const fileName = extractFileNameFromUrl(record.url_file_resolution);
            
            if (fileName) {
              const foundPath = fileIndex[fileName] || fileIndex[fileName.toLowerCase()];
              
              if (foundPath) {
                totalFilesFound++;
                const destPath = path.join(CONFIG.uploadDestination, fileName);
                
                if (!CONFIG.dryRun) {
                  const fileInfo = await copyFile(foundPath, destPath);
                  if (fileInfo.exists) {
                    resolutionData.fileName = fileName;
                    resolutionData.fileUrl = CONFIG.publicUrlBase + fileName;
                    resolutionData.fileSize = fileInfo.size;
                    resolutionData.fileMimeType = 'application/pdf';
                    console.log(`   📎 Archivo copiado: ${fileName}`);
                  }
                } else {
                  console.log(`   📎 [SIMULACIÓN] Archivo encontrado: ${fileName}`);
                  resolutionData.fileName = fileName;
                  resolutionData.fileUrl = CONFIG.publicUrlBase + fileName;
                }
              } else {
                resolutionData.fileUrl = record.url_file_resolution;
                console.log(`   ⚠️  Archivo no encontrado localmente: ${fileName}`);
              }
            }
          }
          
          // Guardar en base de datos
          if (!CONFIG.dryRun) {
            // Crear la resolución
            const created = await prisma.resolucion.create({
              data: resolutionData
            });
            
            // Parsear y agregar docentes
            const teachers = parseParticipants(record.teachers);
            for (const teacher of teachers) {
              if (teacher.dni && teacher.fullName) {
                await prisma.docenteResolucion.create({
                  data: {
                    resolucionId: created.id,
                    dni: teacher.dni || '',
                    nombres: teacher.fullName?.split(' ').slice(0, -2).join(' ') || '',
                    apellidos: teacher.fullName?.split(' ').slice(-2).join(' ') || teacher.fullName || '',
                  }
                });
              }
            }
            
            // Parsear y agregar estudiantes
            const students = parseParticipants(record.students);
            for (const student of students) {
              if (student.dni || student.code) {
                await prisma.estudianteResolucion.create({
                  data: {
                    resolucionId: created.id,
                    dni: student.dni || '',
                    codigo: student.code || student.codigo || '',
                    nombres: student.fullName?.split(' ').slice(0, -2).join(' ') || student.name || '',
                    apellidos: student.fullName?.split(' ').slice(-2).join(' ') || '',
                  }
                });
              }
            }
            
            console.log(`✅ Resolución ${created.numeroResolucion} migrada - ${resolutionData.tipoResolucion}`);
          } else {
            console.log(`✅ [SIMULACIÓN] Resolución ${resolutionData.numeroResolucion} lista`);
            console.log(`   Tipo: ${resolutionData.tipoResolucion}`);
            console.log(`   Modalidad: ${resolutionData.modalidad}`);
            console.log(`   Proyecto: ${resolutionData.tituloProyecto.substring(0, 50)}...`);
            
            // Mostrar participantes
            const teachers = parseParticipants(record.teachers);
            const students = parseParticipants(record.students);
            if (teachers.length > 0) console.log(`   Docentes: ${teachers.length}`);
            if (students.length > 0) console.log(`   Estudiantes: ${students.length}`);
          }
          
          totalSuccess++;
          
        } catch (error) {
          console.error(`❌ Error procesando resolución ${record.num_resolution}:`, error.message);
          totalErrors++;
        }
      }
      
      // Pausa entre lotes
      if (batchIndex < batches.length - 1 && !CONFIG.dryRun) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 8. Resumen final
    console.log('\n=====================================');
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('=====================================');
    console.log(`📄 Total procesados: ${totalProcessed}`);
    console.log(`✅ Exitosos: ${totalSuccess}`);
    console.log(`⏭️  Saltados (duplicados): ${totalSkipped}`);
    console.log(`❌ Errores: ${totalErrors}`);
    console.log('\n📎 ARCHIVOS:');
    console.log(`   Resoluciones con URL: ${totalWithFiles}`);
    console.log(`   Archivos encontrados: ${totalFilesFound}`);
    console.log(`   Archivos no encontrados: ${totalWithFiles - totalFilesFound}`);
    console.log('=====================================');
    
    if (CONFIG.dryRun) {
      console.log('\n⚠️  MODO SIMULACIÓN - No se guardaron cambios');
      console.log('📌 Para ejecutar la migración real:');
      console.log('    node scripts/migrate-resolutions.js --execute');
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal en la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ==================== VERIFICACIÓN ====================

async function verifyMigration() {
  console.log('\n🔍 VERIFICANDO MIGRACIÓN DE RESOLUCIONES');
  console.log('=====================================');
  
  const total = await prisma.resolucion.count();
  console.log(`📄 Total de resoluciones en DB: ${total}`);
  
  const byType = await prisma.resolucion.groupBy({
    by: ['tipoResolucion'],
    _count: true,
  });
  
  console.log('\n📊 Por tipo de resolución:');
  byType.forEach(item => {
    console.log(`   ${item.tipoResolucion}: ${item._count}`);
  });
  
  const byModalidad = await prisma.resolucion.groupBy({
    by: ['modalidad'],
    _count: true,
  });
  
  console.log('\n📊 Por modalidad:');
  byModalidad.forEach(item => {
    console.log(`   ${item.modalidad}: ${item._count}`);
  });
  
  const withFiles = await prisma.resolucion.count({
    where: { fileUrl: { not: null } }
  });
  console.log(`\n📎 Resoluciones con archivos: ${withFiles}`);
  
  const totalDocentes = await prisma.docenteResolucion.count();
  const totalEstudiantes = await prisma.estudianteResolucion.count();
  console.log(`\n👥 Participantes:`);
  console.log(`   Docentes: ${totalDocentes}`);
  console.log(`   Estudiantes: ${totalEstudiantes}`);
}

// ==================== EJECUTAR ====================

const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const shouldVerify = args.includes('--verify');

if (shouldVerify) {
  verifyMigration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  CONFIG.dryRun = isDryRun;
  
  migrateResolutions()
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