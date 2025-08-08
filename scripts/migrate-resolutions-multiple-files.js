// scripts/migrate-resolutions-multiple-files.js
// Script de migración con soporte para MÚLTIPLES ARCHIVOS por resolución

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
  batchSize: 10,
  dryRun: true, // Cambiar a false para ejecutar
  
  defaultFacultadId: null,
  defaultDepartamentoId: null,
};

// MAPEO DE TIPO DE RESOLUCIÓN (FALTABA)
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

// MAPEO DE MODALIDAD (FALTABA)
const MODALIDAD_MAP = {
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
  '1': 'FE',    // Facultad de Ecoturismo
  '2': 'FI',    // Facultad de Ingeniería  
  '3': 'FEDU',  // Facultad de Educación
  'ECOTURISMO': 'FE',
  'INGENIERIA': 'FI',
  'EDUCACION': 'FEDU',
  'EDUCACIÓN': 'FEDU',
  'INGENIERÍA': 'FI'
};

// MAPEO DE DEPARTAMENTOS
const DEPARTAMENTO_MAP = {
  // Ecoturismo
  '1': 'DACA',  // Contabilidad y Administración
  '2': 'DAE',   // Ecoturismo
  
  // Ingeniería
  '3': 'DAIFMA', // Forestal y Medio Ambiente
  '4': 'DAISI',  // Sistemas e Informática
  '5': 'DAIA',   // Agroindustrial
  '6': 'DAMVZ',  // Medicina Veterinaria
  '7': 'DACB',   // Ciencias Básicas
  
  // Educación
  '8': 'DADCP',  // Derecho y Ciencias Políticas
  '9': 'DAE',    // Enfermería
  '10': 'DAEH',  // Educación y Humanidades
  '11': 'PADCP', // Programa Derecho
  '12': 'PAIE',  // Programa Inicial
  '13': 'PAPI',  // Programa Primaria
  '14': 'PAMC',  // Programa Matemática
  '15': 'PAE',   // Programa Enfermería
  
  // Mapeo por nombres
  'CONTABILIDAD': 'DACA',
  'ADMINISTRACION': 'DACA',
  'SISTEMAS': 'DAISI',
  'FORESTAL': 'DAIFMA',
  'DERECHO': 'DADCP',
  'ENFERMERIA': 'DAE',
  'ENFERMERÍA': 'DAE'
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

// Encontrar TODOS los archivos relacionados con una resolución
function findAllFilesForResolution(numeroResolucion, storagePath) {
  const foundFiles = [];
  
  if (!fs.existsSync(storagePath)) {
    return foundFiles;
  }
  
  // Limpiar número de resolución para búsqueda
  const cleanNumber = numeroResolucion.replace(/[^\d-]/g, '');
  
  // Función recursiva para buscar en todos los subdirectorios
  function searchRecursive(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Si es directorio, buscar dentro recursivamente
        searchRecursive(fullPath);
      } else {
        // Es un archivo, verificar si pertenece a esta resolución
        const itemLower = item.toLowerCase();
        const itemClean = item.replace(/[^\d-]/g, '');
        
        if (
          item.includes(numeroResolucion) ||
          item.includes(cleanNumber) ||
          itemClean.includes(cleanNumber) ||
          itemLower.includes(numeroResolucion.toLowerCase()) ||
          item.includes(`N°${cleanNumber}`) ||
          item.includes(`N${cleanNumber}`) ||
          item.includes(`resolucion N°${cleanNumber}`) ||
          item.includes(`resolucion N${cleanNumber}`)
        ) {
          // Determinar el tipo de archivo basado en el nombre
          let tipo = 'resolucion';
          if (item.toLowerCase().includes('acta')) {
            tipo = 'acta';
          } else if (item.toLowerCase().includes('anexo')) {
            tipo = 'anexo';
          } else if (item.toLowerCase().includes('informe')) {
            tipo = 'informe';
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
  }
  
  // Iniciar búsqueda recursiva
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
    console.error(`   Error copiando archivo: ${error.message}`);
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
    console.log('✅ Facultad por defecto creada:', facultad.nombre);
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
    console.log('✅ Departamento por defecto creado:', departamento.nombre);
  }
  
  return { facultadId: facultad.id, departamentoId: departamento.id };
}

async function mapFacultadDepartamento(record) {
  // Intentar mapear usando los valores del CSV
  let facultadCodigo = null;
  let departamentoCodigo = null;
  
  // Mapear facultad
  if (record.faculty) {
    const facultyUpper = String(record.faculty).toUpperCase();
    if (facultyUpper.includes('ECOTURISMO')) {
      facultadCodigo = 'FE';
    } else if (facultyUpper.includes('INGENIERIA') || facultyUpper.includes('INGENIERÍA')) {
      facultadCodigo = 'FI';
    } else if (facultyUpper.includes('EDUCACION') || facultyUpper.includes('EDUCACIÓN')) {
      facultadCodigo = 'FEDU';
    } else {
      facultadCodigo = FACULTAD_MAP[record.faculty];
    }
  }
  
  // Mapear departamento
  if (record.departament) {
    const deptUpper = String(record.departament).toUpperCase();
    // Buscar en el mapeo por nombre parcial
    for (const [key, value] of Object.entries(DEPARTAMENTO_MAP)) {
      if (deptUpper.includes(key)) {
        departamentoCodigo = value;
        break;
      }
    }
    // Si no encontró, intentar con el número
    if (!departamentoCodigo) {
      departamentoCodigo = DEPARTAMENTO_MAP[record.departament];
    }
  }
  
  // Si no se pudo mapear o estamos en modo simulación, usar defaults
  if (CONFIG.dryRun) {
    return {
      facultadId: CONFIG.defaultFacultadId,
      departamentoId: CONFIG.defaultDepartamentoId
    };
  }
  
  // Buscar las entidades reales en la BD
  try {
    if (facultadCodigo) {
      const facultad = await prisma.facultad.findFirst({
        where: { codigo: facultadCodigo }
      });
      
      if (facultad) {
        // Si encontramos la facultad, buscar el departamento
        if (departamentoCodigo) {
          const departamento = await prisma.departamento.findFirst({
            where: {
              codigo: departamentoCodigo,
              facultadId: facultad.id
            }
          });
          
          if (departamento) {
            return {
              facultadId: facultad.id,
              departamentoId: departamento.id
            };
          } else {
            // Facultad existe pero no el departamento
            const primerDepto = await prisma.departamento.findFirst({
              where: { facultadId: facultad.id }
            });
            
            if (primerDepto) {
              console.log(`   ⚠️  Depto ${departamentoCodigo} no encontrado, usando ${primerDepto.nombre}`);
              return {
                facultadId: facultad.id,
                departamentoId: primerDepto.id
              };
            }
          }
        }
        
        // Solo tenemos facultad
        const primerDepto = await prisma.departamento.findFirst({
          where: { facultadId: facultad.id }
        });
        
        return {
          facultadId: facultad.id,
          departamentoId: primerDepto ? primerDepto.id : CONFIG.defaultDepartamentoId
        };
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Error mapeando facultad/depto: ${error.message}`);
  }
  
  // Si todo falla, usar los por defecto
  return {
    facultadId: CONFIG.defaultFacultadId,
    departamentoId: CONFIG.defaultDepartamentoId
  };
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

function parseDate(dateValue) {
  if (!dateValue || dateValue === '(vacío)' || dateValue === '' || dateValue === 'undefined' || dateValue === undefined) {
    return new Date();
  }
  
  // Si es timestamp de Firebase (números)
  if (typeof dateValue === 'string' && /^\d+$/.test(dateValue)) {
    const timestamp = parseInt(dateValue);
    if (!isNaN(timestamp) && timestamp > 0) {
      return new Date(timestamp);
    }
  }
  
  if (typeof dateValue === 'number' && dateValue > 0) {
    return new Date(dateValue);
  }
  
  // Intentar parsear como fecha string
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

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
    return null;
  }
  
  return null;
}

function parseParticipants(jsonString, type = 'generic') {
  if (!jsonString || jsonString === '[]' || jsonString === '(vacío)' || jsonString === '' || jsonString === 'undefined') {
    return [];
  }
  
  try {
    let cleanJson = jsonString;
    
    // Si es un string "undefined" o "null", retornar array vacío
    if (cleanJson === 'undefined' || cleanJson === 'null') {
      return [];
    }
    
    // Limpiar y preparar el JSON
    cleanJson = cleanJson.replace(/;/g, ',');
    cleanJson = cleanJson.replace(/'/g, '"');
    
    // Agregar corchetes si es necesario
    if (cleanJson.includes('{') && !cleanJson.startsWith('[')) {
      cleanJson = '[' + cleanJson + ']';
    }
    
    // Arreglar formato de JSON si está incompleto
    if (cleanJson.startsWith('[') && !cleanJson.endsWith(']')) {
      cleanJson += ']';
    }
    
    const parsed = JSON.parse(cleanJson);
    
    if (Array.isArray(parsed)) {
      const results = [];
      
      for (const item of parsed) {
        // Si el item es string, intentar parsearlo de nuevo
        if (typeof item === 'string') {
          try {
            const subParsed = JSON.parse(item);
            results.push({
              dni: subParsed.dni || subParsed.DNI || '',
              fullName: subParsed.fullName || subParsed.nombre || subParsed.name || '',
              code: subParsed.code || subParsed.codigo || subParsed.studentCode || ''
            });
          } catch {
            // Si no se puede parsear, asumir que es un nombre
            results.push({
              dni: '',
              fullName: item,
              code: ''
            });
          }
        } else if (typeof item === 'object' && item !== null) {
          // Es un objeto, extraer datos
          results.push({
            dni: item.dni || item.DNI || '',
            fullName: item.fullName || item.nombre || item.name || '',
            code: item.code || item.codigo || item.studentCode || ''
          });
        }
      }
      
      if (results.length > 0 && CONFIG.dryRun) {
        console.log(`      ✓ ${results.length} ${type} parseados`);
      }
      
      return results;
    }
    
    return [];
  } catch (error) {
    // Intentar parseo manual si falla el JSON
    try {
      const matches = jsonString.match(/\{[^}]+\}/g);
      if (matches) {
        const results = [];
        for (const match of matches) {
          // Extraer campos manualmente
          const nameMatch = match.match(/fullName["':]+([^"',}]+)/i);
          const dniMatch = match.match(/dni["':]+([^"',}]+)/i);
          const codeMatch = match.match(/code["':]+([^"',}]+)/i);
          
          if (nameMatch || dniMatch) {
            results.push({
              dni: dniMatch ? dniMatch[1].trim() : '',
              fullName: nameMatch ? nameMatch[1].trim() : '',
              code: codeMatch ? codeMatch[1].trim() : ''
            });
          }
        }
        
        if (results.length > 0 && CONFIG.dryRun) {
          console.log(`      ✓ ${results.length} ${type} parseados (manual)`);
        }
        
        return results;
      }
    } catch {
      // Si todo falla, retornar vacío
    }
    
    if (CONFIG.dryRun) {
      console.log(`      ⚠️  No se pudo parsear ${type}: ${jsonString.substring(0, 50)}...`);
    }
    
    return [];
  }
}

// ==================== MAPEO DE DATOS ====================

async function mapResolutionData(firebaseData, userId) {
  const tipoOriginal = firebaseData.type_resolution || '';
  const tipoResolucion = TIPO_RESOLUCION_MAP[tipoOriginal] || 'APROBACION_PROYECTO';
  
  const modalidadOriginal = String(firebaseData.modality || '1');
  const modalidad = MODALIDAD_MAP[modalidadOriginal] || 'DOCENTES';
  
  const esFinanciado = firebaseData.is_financed === 'true' || firebaseData.is_financed === true;
  const monto = esFinanciado && firebaseData.amount ? parseFloat(firebaseData.amount) : null;
  
  // En modo simulación, no verificar en BD
  let facultadId = CONFIG.defaultFacultadId;
  let departamentoId = CONFIG.defaultDepartamentoId;
  
  if (!CONFIG.dryRun) {
    const mapped = await mapFacultadDepartamento(firebaseData);
    facultadId = mapped.facultadId;
    departamentoId = mapped.departamentoId;
  }
  
  // LIMPIAR el título del proyecto
  let tituloProyecto = firebaseData.title_project || '';
  // Quitar comillas dobles al principio y final
  tituloProyecto = tituloProyecto.replace(/^["']+|["']+$/g, '');
  // Limitar a 500 caracteres si es muy largo
  if (tituloProyecto.length > 500) {
    tituloProyecto = tituloProyecto.substring(0, 497) + '...';
  }
  
  return {
    tipoResolucion,
    numeroResolucion: firebaseData.num_resolution || firebaseData._id || '',
    fechaResolucion: parseDate(firebaseData.date_resolution),
    modalidad,
    esFinanciado,
    monto,
    dniAsesor: firebaseData.dni_adviser || '',
    nombreAsesor: firebaseData.name_adviser || '',
    tituloProyecto,
    facultadId,
    departamentoId,
    status: 'APROBADO',
    createdById: userId,
    createdAt: parseDate(firebaseData.date_register_resolution),
    updatedAt: firebaseData.date_modified ? parseDate(firebaseData.date_modified) : new Date(),
  };
}

// ==================== PROCESO DE MIGRACIÓN ====================

async function migrateResolutions() {
  console.log('🚀 INICIANDO MIGRACIÓN DE RESOLUCIONES (CON MÚLTIPLES ARCHIVOS)');
  console.log('=====================================');
  console.log(`📁 CSV: ${CONFIG.csvPath}`);
  console.log(`📁 Storage Local: ${CONFIG.storagePath}`);
  console.log(`📁 Destino: ${CONFIG.uploadDestination}`);
  console.log(`🔧 Modo: ${CONFIG.dryRun ? 'SIMULACIÓN' : 'REAL'}`);
  console.log('=====================================\n');
  
  try {
    // 1. Configuración inicial
    if (!CONFIG.dryRun) {
      CONFIG.defaultUserId = await getOrCreateMigrationUser();
      
      const defaults = await getOrCreateDefaults();
      CONFIG.defaultFacultadId = defaults.facultadId;
      CONFIG.defaultDepartamentoId = defaults.departamentoId;
      
      // Mostrar facultades y departamentos disponibles
      console.log('\n📚 FACULTADES Y DEPARTAMENTOS DISPONIBLES:');
      console.log('────────────────────────────────────────');
      
      const facultades = await prisma.facultad.findMany({
        include: { departamentos: true },
        orderBy: { nombre: 'asc' }
      });
      
      facultades.forEach(fac => {
        console.log(`\n📘 ${fac.nombre} (${fac.codigo})`);
        fac.departamentos.forEach(dep => {
          console.log(`   └─ ${dep.nombre} (${dep.codigo})`);
        });
      });
      
      console.log('\n────────────────────────────────────────');
      console.log(`📊 Facultad por defecto: ID ${CONFIG.defaultFacultadId}`);
      console.log(`📊 Departamento por defecto: ID ${CONFIG.defaultDepartamentoId}\n`);
    } else {
      CONFIG.defaultUserId = 'dry-run-user-id';
      CONFIG.defaultFacultadId = 1;
      CONFIG.defaultDepartamentoId = 1;
      console.log('🔍 Modo simulación - IDs ficticios\n');
    }
    
    // Crear carpeta de destino si no existe
    if (!fs.existsSync(CONFIG.uploadDestination)) {
      fs.mkdirSync(CONFIG.uploadDestination, { recursive: true });
      console.log(`📁 Carpeta de destino creada: ${CONFIG.uploadDestination}\n`);
    } else {
      console.log(`📁 Carpeta de destino existe: ${CONFIG.uploadDestination}\n`);
    }
    
    // 2. Leer CSV
    if (!fs.existsSync(CONFIG.csvPath)) {
      throw new Error(`No se encontró archivo CSV: ${CONFIG.csvPath}`);
    }
    
    console.log('📖 Leyendo datos del CSV...');
    const resolutionsData = await readCSV(CONFIG.csvPath);
    console.log(`✅ ${resolutionsData.length} resoluciones encontradas\n`);
    
    // 3. Verificar archivos disponibles
    let totalFilesInStorage = 0;
    if (fs.existsSync(CONFIG.storagePath)) {
      // Contar archivos recursivamente
      function countFiles(dir) {
        let count = 0;
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            count += countFiles(fullPath);
          } else {
            count++;
          }
        });
        return count;
      }
      totalFilesInStorage = countFiles(CONFIG.storagePath);
      console.log(`📁 ${totalFilesInStorage} archivos en storage-backups (incluyendo subdirectorios)\n`);
      
      // Mostrar estructura de carpetas
      const subdirs = fs.readdirSync(CONFIG.storagePath).filter(item => 
        fs.statSync(path.join(CONFIG.storagePath, item)).isDirectory()
      );
      if (subdirs.length > 0) {
        console.log(`   📂 ${subdirs.length} subcarpetas encontradas`);
        if (subdirs.length <= 10) {
          subdirs.forEach(dir => {
            const filesInDir = fs.readdirSync(path.join(CONFIG.storagePath, dir)).length;
            console.log(`      - ${dir}: ${filesInDir} archivo(s)`);
          });
        }
        console.log('');
      }
    } else {
      console.log(`⚠️  No existe la carpeta ${CONFIG.storagePath}\n`);
    }
    
    // 4. Procesar en lotes
    const batches = [];
    for (let i = 0; i < resolutionsData.length; i += CONFIG.batchSize) {
      batches.push(resolutionsData.slice(i, i + CONFIG.batchSize));
    }
    
    console.log(`📦 Procesando en ${batches.length} lotes de ${CONFIG.batchSize} registros\n`);
    
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let totalFilesProcessed = 0;
    let totalFilesCopied = 0;
    let totalFirebaseUrls = 0;
    let totalDocentes = 0;
    let totalEstudiantes = 0;
    
    // 5. Procesar cada lote
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
          
          // Mapear datos básicos (SIN fileName ni fileUrl)
          const resolutionData = await mapResolutionData(record, CONFIG.defaultUserId);
          
          // IMPORTANTE: Remover campos de archivo del modelo principal
          delete resolutionData.fileName;
          delete resolutionData.fileUrl;
          delete resolutionData.fileSize;
          delete resolutionData.fileMimeType;
          
          // Buscar TODOS los archivos relacionados con esta resolución
          const foundFiles = findAllFilesForResolution(record.num_resolution, CONFIG.storagePath);
          
          // Preparar datos de archivos para guardar
          const archivosToCreate = [];
          
          // Si hay archivos locales, usarlos
          if (foundFiles.length > 0) {
            totalFilesProcessed += foundFiles.length;
            console.log(`   📁 ${foundFiles.length} archivo(s) local(es) encontrado(s):`);
            
            for (let i = 0; i < foundFiles.length; i++) {
              const file = foundFiles[i];
              // Nombre simplificado para el destino
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
                  console.log(`      ✓ Copiado: ${file.originalName} (desde ${file.parentFolder}/)`);
                  totalFilesCopied++;
                }
              } else {
                console.log(`      [SIM] ${file.tipo}: ${file.originalName} (en ${file.parentFolder}/)`);
                archivosToCreate.push({
                  fileName: destFileName,
                  fileUrl: CONFIG.publicUrlBase + destFileName,
                  fileSize: file.size,
                  fileMimeType: 'application/pdf',
                  tipo: file.tipo
                });
                totalFilesCopied++; // Contar en simulación también
              }
            }
          }
          
          // Si no hay archivos locales, usar URLs de Firebase
          if (foundFiles.length === 0) {
            if (record.url_file_resolution && record.url_file_resolution !== '(vacío)' && record.url_file_resolution !== '') {
              console.log(`   ⚠️  No hay archivo local, usando URL de Firebase`);
              totalFilesProcessed++;
              totalFirebaseUrls++;
              
              const fileName = extractFileNameFromUrl(record.url_file_resolution) || `resolucion-${record.num_resolution}.pdf`;
              archivosToCreate.push({
                fileName: fileName,
                fileUrl: record.url_file_resolution, // Mantener URL original de Firebase
                fileSize: 0,
                fileMimeType: 'application/pdf',
                tipo: 'resolucion'
              });
            }
          }
          
          // También verificar si hay URL de acta (adicional)
          if (record.url_file_proceedings && record.url_file_proceedings !== '(vacío)' && record.url_file_proceedings !== '') {
            console.log(`   📥 URL adicional de acta encontrada`);
            totalFilesProcessed++;
            totalFirebaseUrls++;
            const fileName = extractFileNameFromUrl(record.url_file_proceedings) || `acta-${record.num_resolution}.pdf`;
            archivosToCreate.push({
              fileName: fileName,
              fileUrl: record.url_file_proceedings, // Mantener URL original de Firebase
              fileSize: 0,
              fileMimeType: 'application/pdf',
              tipo: 'acta'
            });
          }
          
          // Parsear participantes
          const teachers = parseParticipants(record.teachers, 'docentes');
          const students = parseParticipants(record.students, 'estudiantes');
          
          // Debug de participantes en simulación
          if (CONFIG.dryRun && (record.teachers || record.students)) {
            if (record.teachers && record.teachers !== '[]' && record.teachers !== '(vacío)') {
              console.log(`   🔍 Teachers raw: ${record.teachers.substring(0, 100)}...`);
            }
            if (record.students && record.students !== '[]' && record.students !== '(vacío)') {
              console.log(`   🔍 Students raw: ${record.students.substring(0, 100)}...`);
            }
          }
          
          if (teachers.length > 0) totalDocentes += teachers.length;
          if (students.length > 0) totalEstudiantes += students.length;
          
          // Guardar en base de datos
          if (!CONFIG.dryRun) {
            // Crear resolución
            const created = await prisma.resolucion.create({
              data: resolutionData
            });
            
            // Crear registros de archivos
            for (const archivoData of archivosToCreate) {
              await prisma.archivoResolucion.create({
                data: {
                  resolucionId: created.id,
                  ...archivoData
                }
              });
            }
            
            // Agregar docentes
            for (const teacher of teachers) {
              if (teacher.dni || teacher.fullName) {
                try {
                  await prisma.docenteResolucion.create({
                    data: {
                      resolucionId: created.id,
                      dni: teacher.dni || '00000000',
                      nombres: teacher.fullName?.split(' ').slice(0, -2).join(' ') || 'Sin nombre',
                      apellidos: teacher.fullName?.split(' ').slice(-2).join(' ') || teacher.fullName || 'Sin apellido',
                    }
                  });
                } catch (e) {
                  console.log(`   ⚠️  Error agregando docente: ${e.message}`);
                }
              }
            }
            
            // Agregar estudiantes
            for (const student of students) {
              if (student.dni || student.code || student.fullName) {
                try {
                  await prisma.estudianteResolucion.create({
                    data: {
                      resolucionId: created.id,
                      dni: student.dni || '00000000',
                      codigo: student.code || `AUTO-${Date.now()}`,
                      nombres: student.fullName?.split(' ').slice(0, -2).join(' ') || 'Sin nombre',
                      apellidos: student.fullName?.split(' ').slice(-2).join(' ') || 'Sin apellido',
                    }
                  });
                } catch (e) {
                  console.log(`   ⚠️  Error agregando estudiante: ${e.message}`);
                }
              }
            }
            
            console.log(`✅ Resolución ${created.numeroResolucion} migrada`);
            if (archivosToCreate.length > 0) console.log(`   📎 ${archivosToCreate.length} archivo(s) guardado(s)`);
            if (teachers.length > 0) console.log(`   👥 ${teachers.length} docente(s)`);
            if (students.length > 0) console.log(`   👥 ${students.length} estudiante(s)`);
            
            // Mostrar facultad y departamento asignados
            const facultad = await prisma.facultad.findUnique({ where: { id: created.facultadId }});
            const depto = await prisma.departamento.findUnique({ where: { id: created.departamentoId }});
            if (facultad && depto) {
              console.log(`   🏛️ ${facultad.codigo} - ${depto.codigo}`);
            }
          } else {
            // BLOQUE ELSE CORREGIDO - NO DUPLICADO
            console.log(`✅ [SIMULACIÓN] Resolución ${resolutionData.numeroResolucion}`);
            console.log(`   Tipo: ${resolutionData.tipoResolucion}`);
            console.log(`   Modalidad: ${resolutionData.modalidad}`);
            console.log(`   Título: ${resolutionData.tituloProyecto.substring(0, 60)}...`);
            
            // Mostrar mapeo de facultad/departamento
            if (record.faculty || record.departament) {
              console.log(`   🏛️ CSV: Fac[${record.faculty}] Dep[${record.departament}] → Por defecto`);
            }
            
            if (archivosToCreate.length > 0) {
              console.log(`   📎 ${archivosToCreate.length} archivo(s) para guardar`);
              archivosToCreate.forEach(a => {
                const urlPreview = a.fileUrl.startsWith('http') ? 'Firebase URL' : 'Local';
                console.log(`      - ${a.tipo}: ${urlPreview}`);
              });
            }
            if (teachers.length > 0) console.log(`   👥 ${teachers.length} docente(s)`);
            if (students.length > 0) console.log(`   👥 ${students.length} estudiante(s)`);
          }
          
          totalSuccess++;
          
        } catch (error) {
          console.error(`❌ Error en ${record.num_resolution}: ${error.message}`);
          totalErrors++;
        }
      }
      
      if (batchIndex < batches.length - 1 && !CONFIG.dryRun) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 6. Resumen
    console.log('\n=====================================');
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('=====================================');
    console.log(`📄 Total procesados: ${totalProcessed}`);
    console.log(`✅ Exitosos: ${totalSuccess}`);
    console.log(`⏭️  Saltados: ${totalSkipped}`);
    console.log(`❌ Errores: ${totalErrors}`);
    console.log('\n📎 ARCHIVOS:');
    console.log(`   Archivos locales copiados: ${totalFilesCopied}`);
    console.log(`   URLs de Firebase usadas: ${totalFirebaseUrls}`);
    console.log(`   Total de archivos guardados: ${totalFilesProcessed}`);
    
    if (CONFIG.dryRun) {
      console.log(`\n   ℹ️  En modo real, los archivos se copiarán a:`);
      console.log(`      ${CONFIG.uploadDestination}`);
    } else {
      console.log(`\n   ✅ Archivos copiados a: ${CONFIG.uploadDestination}`);
    }
    
    console.log('\n👥 PARTICIPANTES:');
    console.log(`   Docentes totales: ${totalDocentes}`);
    console.log(`   Estudiantes totales: ${totalEstudiantes}`);
    console.log('=====================================');
    
    if (CONFIG.dryRun) {
      console.log('\n⚠️  MODO SIMULACIÓN - No se guardaron cambios');
      console.log('📌 Para ejecutar la migración real:');
      console.log('    node scripts/migrate-resolutions-multiple-files.js --execute');
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
  console.log('\n🔍 VERIFICANDO MIGRACIÓN DE RESOLUCIONES');
  console.log('=====================================');
  
  const total = await prisma.resolucion.count();
  console.log(`📄 Total de resoluciones: ${total}`);
  
  const byType = await prisma.resolucion.groupBy({
    by: ['tipoResolucion'],
    _count: true,
  });
  
  console.log('\n📊 Por tipo:');
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
  
  // Agrupar por facultad
  const byFacultad = await prisma.resolucion.groupBy({
    by: ['facultadId'],
    _count: true,
  });
  
  console.log('\n🏛️ Por facultad:');
  for (const item of byFacultad) {
    const facultad = await prisma.facultad.findUnique({
      where: { id: item.facultadId }
    });
    console.log(`   ${facultad?.nombre || 'Sin facultad'}: ${item._count}`);
  }
  
  // Contar archivos
  const totalArchivos = await prisma.archivoResolucion.count();
  const archivosPorTipo = await prisma.archivoResolucion.groupBy({
    by: ['tipo'],
    _count: true,
  });
  
  console.log(`\n📎 ARCHIVOS:`);
  console.log(`   Total de archivos: ${totalArchivos}`);
  console.log('   Por tipo:');
  archivosPorTipo.forEach(item => {
    console.log(`     - ${item.tipo || 'sin tipo'}: ${item._count}`);
  });
  
  // Resoluciones con múltiples archivos
  const resolucionesConArchivos = await prisma.resolucion.findMany({
    include: {
      _count: {
        select: { archivos: true }
      }
    },
    where: {
      archivos: {
        some: {}
      }
    }
  });
  
  const multipleFiles = resolucionesConArchivos.filter(r => r._count.archivos > 1);
  console.log(`   Resoluciones con múltiples archivos: ${multipleFiles.length}`);
  
  if (multipleFiles.length > 0 && multipleFiles.length <= 5) {
    console.log('   Ejemplos:');
    multipleFiles.slice(0, 5).forEach(r => {
      console.log(`     - ${r.numeroResolucion}: ${r._count.archivos} archivos`);
    });
  }
  
  const totalDocentes = await prisma.docenteResolucion.count();
  const totalEstudiantes = await prisma.estudianteResolucion.count();
  console.log(`\n👥 PARTICIPANTES:`);
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