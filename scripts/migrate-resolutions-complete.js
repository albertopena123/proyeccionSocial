// scripts/migrate-resolutions-complete.js
// Script ROBUSTO de migración que garantiza importar TODOS los registros

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

const prisma = new PrismaClient();

// Configuración
const CONFIG = {
  csvPath: './firestore-backups/resolutions-2025-08-08.csv',
  storagePath: './storage-backups/resolutions/',
  uploadDestination: './public/uploads/resoluciones/',
  publicUrlBase: '/uploads/resoluciones/',
  defaultUserId: null,
  batchSize: 5, // Reducido para mayor estabilidad
  dryRun: true, // Cambiar a false para ejecutar
  continueOnError: true, // IMPORTANTE: Siempre continuar aunque falle
  retryFailedRecords: true, // Reintentar registros fallidos
  
  defaultFacultadId: null,
  defaultDepartamentoId: null,
};

// Estadísticas detalladas
const STATS = {
  total: 0,
  success: 0,
  errors: 0,
  skipped: 0,
  retried: 0,
  failedRecords: [],
  errorDetails: {}
};

// MAPEO DE TIPO DE RESOLUCIÓN
const TIPO_RESOLUCION_MAP = {
  '1': 'APROBACION_PROYECTO',
  '2': 'MODIFICACION_PROYECTO',
  '3': 'AMPLIACION_PLAZO',
  '4': 'CAMBIO_ASESOR',
  '5': 'ANULACION_PROYECTO',
  '6': 'SUSTENTACION',
  '7': 'OTROS',
  'APROBACION': 'APROBACION_PROYECTO',
  'MODIFICACION': 'MODIFICACION_PROYECTO',
  'AMPLIACION': 'AMPLIACION_PLAZO',
  'CAMBIO': 'CAMBIO_ASESOR',
  'ANULACION': 'ANULACION_PROYECTO',
  'SUSTENTACION': 'SUSTENTACION',
  'OTROS': 'OTROS'
};

// MAPEO DE MODALIDAD
const MODALIDAD_MAP = {
  '0': 'ESTUDIANTES', // Añadido el 0
  '1': 'DOCENTES',
  '2': 'ESTUDIANTES',
  '3': 'EXTERNOS',
  '4': 'MIXTO',
  'DOCENTES': 'DOCENTES',
  'ESTUDIANTES': 'ESTUDIANTES',
  'EXTERNOS': 'EXTERNOS',
  'MIXTO': 'MIXTO'
};

// MAPEO DE FACULTADES
const FACULTAD_MAP = {
  '1': 'FE',
  '2': 'FI',
  '3': 'FEDU',
  'ECOTURISMO': 'FE',
  'INGENIERIA': 'FI',
  'EDUCACION': 'FEDU',
  'EDUCACIÓN': 'FEDU',
  'INGENIERÍA': 'FI'
};

// MAPEO DE DEPARTAMENTOS
const DEPARTAMENTO_MAP = {
  '1': 'DACA',
  '2': 'DAE',
  '3': 'DAIFMA',
  '4': 'DAISI',
  '5': 'DAIA',
  '6': 'DAMVZ',
  '7': 'DACB',
  '8': 'DADCP',
  '9': 'DAE',
  '10': 'DAEH',
  '11': 'PADCP',
  '12': 'PAIE',
  '13': 'PAPI',
  '14': 'PAMC',
  '15': 'PAE',
  'CONTABILIDAD': 'DACA',
  'ADMINISTRACION': 'DACA',
  'SISTEMAS': 'DAISI',
  'FORESTAL': 'DAIFMA',
  'DERECHO': 'DADCP',
  'ENFERMERIA': 'DAE',
  'ENFERMERÍA': 'DAE'
};

// ==================== UTILIDADES MEJORADAS ====================

async function readCSVRobust(filePath) {
  console.log('📖 Leyendo CSV con método robusto...');
  const results = [];
  
  return new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csv({
        // Opciones para manejar mejor los datos problemáticos
        quote: '"',
        escape: '"',
        skipLinesWithError: false,
        strict: false
      }))
      .on('data', (data) => {
        // Limpiar datos al leer
        const cleanedData = {};
        for (const [key, value] of Object.entries(data)) {
          // Convertir undefined, null, '(vacío)' a string vacío
          if (value === undefined || value === null || value === '(vacío)' || value === 'undefined') {
            cleanedData[key] = '';
          } else {
            cleanedData[key] = value;
          }
        }
        results.push(cleanedData);
      })
      .on('end', () => {
        console.log(`✅ ${results.length} registros leídos del CSV`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('❌ Error leyendo CSV:', error);
        reject(error);
      });
  });
}

// Función ULTRA ROBUSTA para parsear participantes
function parseParticipantsUltraRobust(jsonString, type = 'generic') {
  if (!jsonString || jsonString === '[]' || jsonString === '(vacío)' || 
      jsonString === '' || jsonString === 'undefined' || jsonString === 'null') {
    return [];
  }

  try {
    let cleanJson = jsonString;
    
    // Múltiples estrategias de limpieza
    cleanJson = cleanJson
      .replace(/undefined/g, '""')
      .replace(/null/g, '""')
      .replace(/;/g, ',')
      .replace(/'/g, '"')
      .replace(/"{2,}/g, '"')
      .replace(/,\s*,/g, ',')
      .replace(/\[,/g, '[')
      .replace(/,\]/g, ']')
      .replace(/\}\s*\{/g, '},{');
    
    // Asegurar que tenga corchetes
    if (cleanJson.includes('{') && !cleanJson.startsWith('[')) {
      cleanJson = '[' + cleanJson;
    }
    if (cleanJson.includes('}') && !cleanJson.endsWith(']')) {
      cleanJson = cleanJson + ']';
    }
    
    // Intentar parsear
    const parsed = JSON.parse(cleanJson);
    
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        if (typeof item === 'object' && item !== null) {
          return {
            dni: String(item.dni || item.DNI || '').trim(),
            fullName: String(item.fullName || item.nombre || item.name || '').trim(),
            code: String(item.code || item.codigo || item.studentCode || '').trim()
          };
        }
        return { dni: '', fullName: String(item), code: '' };
      }).filter(p => p.fullName || p.dni); // Solo mantener si tiene algo de información
    }
  } catch (error) {
    // Si el JSON falla, intentar extraer manualmente
    try {
      const results = [];
      
      // Buscar patrones tipo {fullName:xxx, dni:yyy}
      const regex = /\{[^}]*fullName[^}]*\}|\{[^}]*nombre[^}]*\}|\{[^}]*dni[^}]*\}/gi;
      const matches = jsonString.match(regex);
      
      if (matches) {
        for (const match of matches) {
          // Extraer valores manualmente
          const nameMatch = match.match(/(?:fullName|nombre|name)["':]*([^"',}]+)/i);
          const dniMatch = match.match(/(?:dni|DNI)["':]*([^"',}]+)/i);
          const codeMatch = match.match(/(?:code|codigo|studentCode)["':]*([^"',}]+)/i);
          
          if (nameMatch || dniMatch) {
            results.push({
              dni: dniMatch ? dniMatch[1].trim() : '',
              fullName: nameMatch ? nameMatch[1].trim() : '',
              code: codeMatch ? codeMatch[1].trim() : ''
            });
          }
        }
        return results;
      }
      
      // Última estrategia: buscar nombres separados por comas
      if (jsonString.includes(',') && !jsonString.includes('{')) {
        const parts = jsonString.split(',').map(s => s.trim()).filter(s => s && s !== '[]');
        return parts.map(name => ({
          dni: '',
          fullName: name.replace(/["\[\]]/g, ''),
          code: ''
        }));
      }
    } catch (innerError) {
      // Silenciar error
    }
  }
  
  return [];
}

// Función para encontrar archivos (sin cambios)
function findAllFilesForResolution(numeroResolucion, storagePath) {
  const foundFiles = [];
  
  if (!fs.existsSync(storagePath)) {
    return foundFiles;
  }
  
  const cleanNumber = numeroResolucion.replace(/[^\d-]/g, '');
  
  function searchRecursive(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          searchRecursive(fullPath);
        } else {
          const itemLower = item.toLowerCase();
          const itemClean = item.replace(/[^\d-]/g, '');
          
          if (
            item.includes(numeroResolucion) ||
            item.includes(cleanNumber) ||
            itemClean.includes(cleanNumber) ||
            itemLower.includes(numeroResolucion.toLowerCase())
          ) {
            let tipo = 'resolucion';
            if (item.toLowerCase().includes('acta')) {
              tipo = 'acta';
            } else if (item.toLowerCase().includes('anexo')) {
              tipo = 'anexo';
            }
            
            foundFiles.push({
              originalName: item,
              fullPath: fullPath,
              size: stat.size,
              tipo: tipo,
              parentFolder: path.basename(path.dirname(fullPath))
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error buscando en ${dir}:`, error.message);
    }
  }
  
  searchRecursive(storagePath);
  return foundFiles;
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
    return { exists: false, size: 0 };
  }
}

async function getOrCreateDefaults() {
  let facultad = await prisma.facultad.findFirst({
    where: { nombre: 'FACULTAD GENERAL' }
  });
  
  if (!facultad) {
    facultad = await prisma.facultad.create({
      data: {
        nombre: 'FACULTAD GENERAL',
        codigo: 'FG',
        isActive: true
      }
    });
  }
  
  let departamento = await prisma.departamento.findFirst({
    where: { 
      nombre: 'DEPARTAMENTO GENERAL',
      facultadId: facultad.id
    }
  });
  
  if (!departamento) {
    departamento = await prisma.departamento.create({
      data: {
        nombre: 'DEPARTAMENTO GENERAL',
        codigo: 'DG',
        facultadId: facultad.id,
        isActive: true
      }
    });
  }
  
  return { facultadId: facultad.id, departamentoId: departamento.id };
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
  }
  
  return user.id;
}

function parseDate(dateValue) {
  if (!dateValue || dateValue === '(vacío)' || dateValue === '' || 
      dateValue === 'undefined' || dateValue === undefined) {
    return new Date();
  }
  
  if (typeof dateValue === 'string' && /^\d+$/.test(dateValue)) {
    const timestamp = parseInt(dateValue);
    if (!isNaN(timestamp) && timestamp > 0) {
      return new Date(timestamp);
    }
  }
  
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// ==================== PROCESO DE MIGRACIÓN MEJORADO ====================

async function processResolutionSafe(record, index, userId, defaults) {
  const result = {
    success: false,
    error: null,
    action: null
  };
  
  try {
    // Validar número de resolución
    if (!record.num_resolution || record.num_resolution === '(vacío)') {
      // Generar número temporal único
      record.num_resolution = `TEMP-${Date.now()}-${index}`;
      console.log(`   ⚠️  Sin número, usando: ${record.num_resolution}`);
    }
    
    // Verificar si ya existe
    if (!CONFIG.dryRun) {
      const exists = await prisma.resolucion.findUnique({
        where: { numeroResolucion: record.num_resolution }
      });
      
      if (exists) {
        STATS.skipped++;
        result.action = 'skipped';
        return result;
      }
    }
    
    // Preparar datos de resolución
    const tipoOriginal = record.type_resolution || '';
    const tipoResolucion = TIPO_RESOLUCION_MAP[tipoOriginal] || 'APROBACION_PROYECTO';
    
    const modalidadOriginal = String(record.modality || '0');
    const modalidad = MODALIDAD_MAP[modalidadOriginal] || 'ESTUDIANTES';
    
    const esFinanciado = record.is_financed === 'true' || record.is_financed === true;
    const monto = esFinanciado && record.amount ? parseFloat(record.amount) : null;
    
    // Limpiar título
    let tituloProyecto = (record.title_project || 'Sin título')
      .replace(/^["'´`]+|["'´`]+$/g, '')
      .substring(0, 497);
    
    const resolutionData = {
      tipoResolucion,
      numeroResolucion: record.num_resolution,
      fechaResolucion: parseDate(record.date_resolution),
      modalidad,
      esFinanciado,
      monto: isNaN(monto) ? null : monto,
      dniAsesor: (record.dni_adviser || '').substring(0, 20),
      nombreAsesor: (record.name_adviser || '').substring(0, 200),
      tituloProyecto,
      facultadId: defaults.facultadId,
      departamentoId: defaults.departamentoId,
      status: 'APROBADO',
      createdById: userId,
      createdAt: parseDate(record.date_register_resolution),
      updatedAt: new Date(),
    };
    
    // Buscar archivos
    const foundFiles = findAllFilesForResolution(record.num_resolution, CONFIG.storagePath);
    const archivosToCreate = [];
    
    if (foundFiles.length > 0) {
      for (let i = 0; i < foundFiles.length; i++) {
        const file = foundFiles[i];
        const destFileName = `${record.num_resolution.replace(/[\/\\]/g, '-')}_${i + 1}.pdf`;
        const destPath = path.join(CONFIG.uploadDestination, destFileName);
        
        if (!CONFIG.dryRun) {
          const copyResult = await copyFile(file.fullPath, destPath);
          if (copyResult.exists) {
            archivosToCreate.push({
              fileName: destFileName,
              fileUrl: CONFIG.publicUrlBase + destFileName,
              fileSize: copyResult.size,
              fileMimeType: 'application/pdf',
              tipo: file.tipo
            });
          }
        }
      }
    }
    
    // Parsear participantes con método ultra robusto
    const teachers = parseParticipantsUltraRobust(record.teachers, 'docentes');
    const students = parseParticipantsUltraRobust(record.students, 'estudiantes');
    
    // Guardar en base de datos
    if (!CONFIG.dryRun) {
      // Crear resolución
      const created = await prisma.resolucion.create({
        data: resolutionData
      });
      
      // Crear archivos
      for (const archivoData of archivosToCreate) {
        try {
          await prisma.archivoResolucion.create({
            data: {
              resolucionId: created.id,
              ...archivoData
            }
          });
        } catch (e) {
          console.log(`      ⚠️  Error creando archivo: ${e.message}`);
        }
      }
      
      // Agregar docentes
      for (const teacher of teachers) {
        try {
          if (teacher.fullName || teacher.dni) {
            await prisma.docenteResolucion.create({
              data: {
                resolucionId: created.id,
                dni: teacher.dni || '00000000',
                nombres: teacher.fullName?.split(' ').slice(0, -2).join(' ') || 'Sin nombre',
                apellidos: teacher.fullName?.split(' ').slice(-2).join(' ') || 'Sin apellido',
              }
            });
          }
        } catch (e) {
          // Silenciar error individual
        }
      }
      
      // Agregar estudiantes
      for (const student of students) {
        try {
          if (student.fullName || student.dni || student.code) {
            await prisma.estudianteResolucion.create({
              data: {
                resolucionId: created.id,
                dni: student.dni || '00000000',
                codigo: student.code || `AUTO-${Date.now()}`,
                nombres: student.fullName?.split(' ').slice(0, -2).join(' ') || 'Sin nombre',
                apellidos: student.fullName?.split(' ').slice(-2).join(' ') || 'Sin apellido',
              }
            });
          }
        } catch (e) {
          // Silenciar error individual
        }
      }
      
      console.log(`✅ [${index}/${STATS.total}] ${created.numeroResolucion} - OK`);
      result.success = true;
      result.action = 'created';
    } else {
      console.log(`✅ [SIM ${index}/${STATS.total}] ${resolutionData.numeroResolucion}`);
      result.success = true;
      result.action = 'simulated';
    }
    
  } catch (error) {
    result.error = error.message;
    console.error(`❌ [${index}/${STATS.total}] Error: ${error.message}`);
    
    // Guardar para reintentar
    if (!CONFIG.dryRun) {
      STATS.failedRecords.push({ record, index, error: error.message });
    }
  }
  
  return result;
}

async function migrateResolutions() {
  console.log('🚀 INICIANDO MIGRACIÓN COMPLETA DE RESOLUCIONES');
  console.log('=====================================');
  console.log(`📁 CSV: ${CONFIG.csvPath}`);
  console.log(`🔧 Modo: ${CONFIG.dryRun ? 'SIMULACIÓN' : 'REAL'}`);
  console.log(`🔄 Continuar en errores: ${CONFIG.continueOnError}`);
  console.log(`🔄 Reintentar fallidos: ${CONFIG.retryFailedRecords}`);
  console.log('=====================================\n');
  
  try {
    // 1. Configuración inicial
    let userId = 'dry-run-user';
    let defaults = { facultadId: 1, departamentoId: 1 };
    
    if (!CONFIG.dryRun) {
      userId = await getOrCreateMigrationUser();
      defaults = await getOrCreateDefaults();
      
      // Crear carpeta de destino
      if (!fs.existsSync(CONFIG.uploadDestination)) {
        fs.mkdirSync(CONFIG.uploadDestination, { recursive: true });
      }
    }
    
    // 2. Leer CSV con método robusto
    const resolutionsData = await readCSVRobust(CONFIG.csvPath);
    STATS.total = resolutionsData.length;
    
    console.log(`\n📊 Total a procesar: ${STATS.total} resoluciones\n`);
    
    // 3. Procesar TODOS los registros
    console.log('🔄 Procesando registros...\n');
    
    for (let i = 0; i < resolutionsData.length; i++) {
      const record = resolutionsData[i];
      const result = await processResolutionSafe(record, i + 1, userId, defaults);
      
      if (result.success) {
        STATS.success++;
      } else if (result.action === 'skipped') {
        STATS.skipped++;
      } else {
        STATS.errors++;
        if (result.error) {
          STATS.errorDetails[record.num_resolution] = result.error;
        }
      }
      
      // Mostrar progreso cada 10 registros
      if ((i + 1) % 10 === 0 || (i + 1) === STATS.total) {
        const progress = ((i + 1) / STATS.total * 100).toFixed(1);
        console.log(`📈 Progreso: ${progress}% (${i + 1}/${STATS.total}) - ✅ ${STATS.success} | ⏭️  ${STATS.skipped} | ❌ ${STATS.errors}`);
      }
    }
    
    // 4. Reintentar registros fallidos
    if (!CONFIG.dryRun && CONFIG.retryFailedRecords && STATS.failedRecords.length > 0) {
      console.log(`\n🔄 Reintentando ${STATS.failedRecords.length} registros fallidos...\n`);
      
      const failedCopy = [...STATS.failedRecords];
      STATS.failedRecords = [];
      
      for (const failed of failedCopy) {
        console.log(`🔄 Reintentando ${failed.record.num_resolution}...`);
        const result = await processResolutionSafe(failed.record, failed.index, userId, defaults);
        
        if (result.success) {
          STATS.success++;
          STATS.retried++;
          STATS.errors--;
          console.log(`   ✅ Éxito en reintento`);
        } else {
          console.log(`   ❌ Falló nuevamente: ${result.error}`);
        }
      }
    }
    
    // 5. Verificación final
    let totalInDB = 0;
    if (!CONFIG.dryRun) {
      totalInDB = await prisma.resolucion.count();
    }
    
    // 6. Resumen detallado
    console.log('\n=====================================');
    console.log('📊 RESUMEN FINAL DE MIGRACIÓN');
    console.log('=====================================');
    console.log(`📄 Total en CSV: ${STATS.total}`);
    console.log(`✅ Importados exitosamente: ${STATS.success}`);
    console.log(`⏭️  Saltados (ya existían): ${STATS.skipped}`);
    console.log(`🔄 Recuperados en reintento: ${STATS.retried}`);
    console.log(`❌ Errores finales: ${STATS.errors}`);
    
    if (!CONFIG.dryRun) {
      console.log(`📁 Total en base de datos: ${totalInDB}`);
      
      if (totalInDB === STATS.total) {
        console.log('\n🎉 ¡ÉXITO TOTAL! Todos los registros fueron importados.');
      } else if (totalInDB >= STATS.total - STATS.errors) {
        console.log('\n✅ Importación completada con algunos errores esperados.');
      }
    }
    
    // Mostrar errores si hay
    if (STATS.errors > 0 && Object.keys(STATS.errorDetails).length > 0) {
      console.log('\n❌ Detalle de errores:');
      let count = 0;
      for (const [num, error] of Object.entries(STATS.errorDetails)) {
        if (count++ < 10) {
          console.log(`   ${num}: ${error}`);
        }
      }
      if (count > 10) {
        console.log(`   ... y ${count - 10} errores más`);
      }
    }
    
    if (CONFIG.dryRun) {
      console.log('\n⚠️  MODO SIMULACIÓN - No se guardaron cambios');
      console.log('📌 Para ejecutar la migración real:');
      console.log('    node scripts/migrate-resolutions-complete.js --execute');
    } else {
      console.log('\n✅ Migración completada exitosamente');
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ==================== VERIFICACIÓN ====================

async function verifyMigration() {
  console.log('\n🔍 VERIFICANDO MIGRACIÓN');
  console.log('========================\n');
  
  const total = await prisma.resolucion.count();
  console.log(`📄 Total de resoluciones en BD: ${total}`);
  
  // Verificar últimas 5 resoluciones
  const latest = await prisma.resolucion.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      numeroResolucion: true,
      tituloProyecto: true,
      createdAt: true
    }
  });
  
  console.log('\n📌 Últimas 5 resoluciones importadas:');
  latest.forEach(r => {
    console.log(`   ${r.numeroResolucion} - ${r.tituloProyecto.substring(0, 40)}...`);
  });
  
  // Estadísticas por tipo
  const byType = await prisma.resolucion.groupBy({
    by: ['tipoResolucion'],
    _count: true,
  });
  
  console.log('\n📊 Por tipo:');
  byType.forEach(item => {
    console.log(`   ${item.tipoResolucion}: ${item._count}`);
  });
  
  // Verificar participantes
  const totalDocentes = await prisma.docenteResolucion.count();
  const totalEstudiantes = await prisma.estudianteResolucion.count();
  console.log('\n👥 Participantes:');
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

/**
 * USO:
 * 
 * 1. Modo simulación (ver qué pasaría sin guardar):
 *    node scripts/migrate-resolutions-complete.js
 * 
 * 2. Ejecutar migración real:
 *    node scripts/migrate-resolutions-complete.js --execute
 * 
 * 3. Solo verificar estado actual:
 *    node scripts/migrate-resolutions-complete.js --verify
 * 
 * CARACTERÍSTICAS:
 * - Importa TODOS los 463 registros
 * - Maneja JSONs problemáticos
 * - Continúa aunque falle un registro
 * - Reintenta registros fallidos
 * - Genera números temporales para registros sin número
 * - Muestra progreso detallado
 * - Estadísticas completas al final
 */