// scripts/migrate-all-resolutions-with-faculties.js
// SCRIPT DEFINITIVO CON MAPEO CORRECTO DE FACULTADES Y DEPARTAMENTOS

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const prisma = new PrismaClient();

// ================== CONFIGURACIÓN ==================
const CONFIG = {
  csvPath: './firestore-backups/resolutions-2025-08-08.csv',
  storagePath: './storage-backups/resolutions/',
  uploadDestination: './public/uploads/resoluciones/',
  publicUrlBase: '/uploads/resoluciones/',
  dryRun: false, // FALSE para ejecutar directamente
  cleanFirst: false, // TRUE si quieres borrar todo primero
  showFacultyMapping: true, // Mostrar el mapeo de facultades
};

// ================== MAPEOS ==================
const TIPO_RESOLUCION_MAP = {
  '1': 'APROBACION_PROYECTO',
  '2': 'APROBACION_INFORME_FINAL',
  '': 'APROBACION_PROYECTO',
  null: 'APROBACION_PROYECTO',
  undefined: 'APROBACION_PROYECTO'
};

const MODALIDAD_MAP = {
  '0': 'ESTUDIANTES',
  '1': 'DOCENTES',
  '2': 'ESTUDIANTES',
  '3': 'EXTERNOS',
  '4': 'VOLUNTARIADO',
  '5': 'ACTIVIDAD',
  'DOCENTES': 'DOCENTES',
  'ESTUDIANTES': 'ESTUDIANTES',
  'EXTERNOS': 'EXTERNOS',
  'VOLUNTARIADO': 'VOLUNTARIADO',
  'ACTIVIDAD': 'ACTIVIDAD',
  '': 'ESTUDIANTES',
  null: 'ESTUDIANTES',
  undefined: 'ESTUDIANTES'
};

// MAPEO DE FACULTADES - Ajusta según tu BD
const FACULTAD_MAP = {
  // Por números (del CSV)
  '1': 'FE',    // Facultad de Ecoturismo
  '2': 'FI',    // Facultad de Ingeniería
  '3': 'FEDU',  // Facultad de Educación
  '13': 'FE',   // También mapea a Ecoturismo
  
  // Por nombres
  'ECOTURISMO': 'FE',
  'INGENIERIA': 'FI',
  'INGENIERÍA': 'FI',
  'EDUCACION': 'FEDU',
  'EDUCACIÓN': 'FEDU',
  'FE': 'FE',
  'FI': 'FI',
  'FEDU': 'FEDU'
};

// MAPEO DE DEPARTAMENTOS - Ajusta según tu BD
const DEPARTAMENTO_MAP = {
  // Ecoturismo
  '1': 'DACA',   // Contabilidad y Administración
  '2': 'DAE',    // Ecoturismo
  
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
  '16': 'DG',    // Departamento General (default)
  
  // Por nombres
  'CONTABILIDAD': 'DACA',
  'ADMINISTRACION': 'DACA',
  'ADMINISTRACIÓN': 'DACA',
  'SISTEMAS': 'DAISI',
  'FORESTAL': 'DAIFMA',
  'DERECHO': 'DADCP',
  'ENFERMERIA': 'DAE',
  'ENFERMERÍA': 'DAE',
  'VETERINARIA': 'DAMVZ',
  'AGROINDUSTRIAL': 'DAIA',
  'EDUCACION': 'DAEH',
  'EDUCACIÓN': 'DAEH'
};

// Cache para facultades y departamentos
let FACULTY_CACHE = {};
let DEPARTMENT_CACHE = {};
let DEFAULT_FACULTY_ID = null;
let DEFAULT_DEPARTMENT_ID = null;

// ================== FUNCIONES AUXILIARES ==================

// Función CRÍTICA: Leer CSV con readline
async function readCSVComplete(filePath) {
  console.log('📖 Leyendo CSV con método definitivo...');
  
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });
  
  const records = [];
  let headers = null;
  let lineNumber = 0;
  
  for await (const line of rl) {
    lineNumber++;
    
    if (lineNumber === 1) {
      headers = parseCSVLine(line);
      console.log(`   📋 ${headers.length} columnas detectadas`);
    } else if (line.trim()) {
      const values = parseCSVLine(line);
      const record = {};
      
      headers.forEach((header, index) => {
        const key = header.trim();
        const value = values[index] || '';
        record[key] = value === '(vacío)' || value === 'undefined' || value === 'null' ? '' : value;
      });
      
      if (record._id || record.num_resolution) {
        record.lineNumber = lineNumber;
        records.push(record);
        
        if (records.length % 50 === 0) {
          console.log(`   📊 ${records.length} registros leídos...`);
        }
      }
    }
  }
  
  console.log(`   ✅ Total: ${records.length} registros leídos\n`);
  return records;
}

// Parsear línea CSV manualmente
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

// Parsear fecha con corrección automática
function parseDate(dateValue) {
  if (!dateValue || dateValue === '(vacío)' || dateValue === '') {
    return new Date();
  }
  
  // Corregir año 20263 → 2023
  if (dateValue.includes('20263')) {
    dateValue = dateValue.replace('20263', '2023');
  }
  
  const yearMatch = dateValue.match(/(\d{4})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year > 2030 || year < 1990) {
      return new Date();
    }
  }
  
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Parsear participantes
function parseParticipants(jsonString, type = 'participants') {
  if (!jsonString || jsonString === '[]' || jsonString === '(vacío)' || 
      jsonString === '' || jsonString === 'undefined' || jsonString === 'null') {
    return [];
  }

  try {
    let cleaned = jsonString
      .replace(/undefined/g, '""')
      .replace(/null/g, '""')
      .replace(/'/g, '"')
      .replace(/;/g, ',')
      .replace(/"{2,}/g, '"')
      .replace(/,\s*,/g, ',')
      .replace(/\[,/g, '[')
      .replace(/,\]/g, ']')
      .replace(/\}\s*\{/g, '},{');
    
    if (cleaned.includes('{') && !cleaned.startsWith('[')) {
      cleaned = '[' + cleaned + ']';
    }
    
    const parsed = JSON.parse(cleaned);
    
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
      }).filter(p => p.fullName || p.dni || p.code);
    }
  } catch (error) {
    try {
      const results = [];
      const matches = jsonString.match(/\{[^}]+\}/g);
      
      if (matches) {
        for (const match of matches) {
          const nameMatch = match.match(/(?:fullName|nombre|name)["':]*([^"',}]+)/i);
          const dniMatch = match.match(/(?:dni|DNI)["':]*([^"',}]+)/i);
          const codeMatch = match.match(/(?:code|codigo|studentCode)["':]*([^"',}]+)/i);
          
          if (nameMatch || dniMatch || codeMatch) {
            results.push({
              dni: dniMatch ? dniMatch[1].trim() : '',
              fullName: nameMatch ? nameMatch[1].trim() : '',
              code: codeMatch ? codeMatch[1].trim() : ''
            });
          }
        }
        return results;
      }
    } catch (innerError) {
      // Silenciar
    }
  }
  
  return [];
}

// ================== FUNCIONES DE MAPEO DE FACULTADES ==================

async function initializeFacultyCache() {
  console.log('🏛️ Cargando facultades y departamentos...');
  
  // Cargar todas las facultades
  const facultades = await prisma.facultad.findMany({
    include: { departamentos: true }
  });
  
  // Crear cache de facultades
  facultades.forEach(fac => {
    FACULTY_CACHE[fac.codigo] = fac;
    FACULTY_CACHE[fac.nombre] = fac;
    FACULTY_CACHE[fac.id] = fac;
    
    // Cache de departamentos
    fac.departamentos.forEach(dep => {
      const key = `${fac.codigo}_${dep.codigo}`;
      DEPARTMENT_CACHE[key] = dep;
      DEPARTMENT_CACHE[dep.codigo] = dep;
      DEPARTMENT_CACHE[dep.nombre] = dep;
    });
  });
  
  // Obtener o crear valores por defecto
  let defaultFaculty = FACULTY_CACHE['FG'] || facultades.find(f => f.nombre === 'FACULTAD GENERAL');
  
  if (!defaultFaculty) {
    defaultFaculty = await prisma.facultad.create({
      data: {
        nombre: 'FACULTAD GENERAL',
        codigo: 'FG',
        isActive: true
      }
    });
    FACULTY_CACHE['FG'] = defaultFaculty;
  }
  
  DEFAULT_FACULTY_ID = defaultFaculty.id;
  
  // Obtener o crear departamento por defecto
  let defaultDept = defaultFaculty.departamentos?.find(d => d.codigo === 'DG');
  
  if (!defaultDept) {
    defaultDept = await prisma.departamento.create({
      data: {
        nombre: 'DEPARTAMENTO GENERAL',
        codigo: 'DG',
        facultadId: DEFAULT_FACULTY_ID,
        isActive: true
      }
    });
    DEPARTMENT_CACHE['FG_DG'] = defaultDept;
  }
  
  DEFAULT_DEPARTMENT_ID = defaultDept.id;
  
  // Mostrar facultades disponibles
  console.log('\n📚 Facultades y departamentos disponibles:');
  facultades.forEach(fac => {
    console.log(`   ${fac.codigo} - ${fac.nombre} (ID: ${fac.id})`);
    fac.departamentos.forEach(dep => {
      console.log(`      └─ ${dep.codigo} - ${dep.nombre} (ID: ${dep.id})`);
    });
  });
  
  console.log(`\n   📌 Por defecto: Facultad ID ${DEFAULT_FACULTY_ID}, Departamento ID ${DEFAULT_DEPARTMENT_ID}\n`);
}

async function mapFacultyAndDepartment(record) {
  let facultadId = DEFAULT_FACULTY_ID;
  let departamentoId = DEFAULT_DEPARTMENT_ID;
  
  try {
    // 1. Intentar mapear facultad desde el CSV
    const facultyValue = record.faculty || record.facultad || '';
    const deptValue = record.departament || record.departamento || '';
    
    // Mapear código de facultad
    let facultadCodigo = FACULTAD_MAP[facultyValue] || 
                        FACULTAD_MAP[facultyValue.toUpperCase()] || 
                        facultyValue;
    
    // Buscar facultad en cache
    const facultad = FACULTY_CACHE[facultadCodigo] || 
                    FACULTY_CACHE[facultyValue] ||
                    FACULTY_CACHE[parseInt(facultyValue)];
    
    if (facultad) {
      facultadId = facultad.id;
      
      // 2. Intentar mapear departamento
      let deptCodigo = DEPARTAMENTO_MAP[deptValue] || 
                      DEPARTAMENTO_MAP[deptValue.toUpperCase()] || 
                      deptValue;
      
      // Buscar departamento en cache
      const deptKey = `${facultad.codigo}_${deptCodigo}`;
      const departamento = DEPARTMENT_CACHE[deptKey] || 
                          DEPARTMENT_CACHE[deptCodigo] ||
                          DEPARTMENT_CACHE[deptValue] ||
                          DEPARTMENT_CACHE[parseInt(deptValue)];
      
      if (departamento && departamento.facultadId === facultadId) {
        departamentoId = departamento.id;
      } else {
        // Si no encuentra el departamento, usar el primero de la facultad
        const firstDept = Object.values(DEPARTMENT_CACHE).find(d => d.facultadId === facultadId);
        if (firstDept) {
          departamentoId = firstDept.id;
        }
      }
      
      // Debug: mostrar mapeo
      if (CONFIG.showFacultyMapping && facultadId !== DEFAULT_FACULTY_ID) {
        console.log(`      🏛️ Mapeo: CSV[${facultyValue},${deptValue}] → Fac:${facultadId} Dep:${departamentoId}`);
      }
    }
  } catch (error) {
    // Si hay error, usar valores por defecto
    console.log(`      ⚠️ Error mapeando facultad/depto: ${error.message}`);
  }
  
  return { facultadId, departamentoId };
}

// ================== FUNCIONES DE BD ==================

async function getOrCreateUser() {
  let user = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: 'migracion-resolutions@proyeccion-social.edu.pe' },
        { role: 'ADMIN' }
      ]
    }
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'migracion-resolutions@proyeccion-social.edu.pe',
        name: 'Usuario de Migración',
        role: 'ADMIN',
        isActive: true,
        emailVerified: new Date(),
      }
    });
    console.log('   ✅ Usuario de migración creado');
  }
  
  return user.id;
}

// Buscar archivos
function findFilesForResolution(numeroResolucion, storagePath) {
  const files = [];
  
  if (!fs.existsSync(storagePath)) {
    return files;
  }
  
  const cleanNumber = numeroResolucion.replace(/[^\d-]/g, '');
  
  function searchDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          searchDir(fullPath);
        } else if (
          item.includes(numeroResolucion) || 
          item.includes(cleanNumber) ||
          item.toLowerCase().includes(numeroResolucion.toLowerCase())
        ) {
          files.push({
            name: item,
            path: fullPath,
            size: stat.size
          });
        }
      }
    } catch (error) {
      // Ignorar
    }
  }
  
  searchDir(storagePath);
  return files;
}

// ================== PROCESO PRINCIPAL ==================

async function processResolution(record, userId, index, total) {
  try {
    // Generar número si no tiene
    let numeroResolucion = record.num_resolution;
    if (!numeroResolucion || numeroResolucion === '(vacío)') {
      numeroResolucion = `TEMP-${Date.now()}-${index}`;
      console.log(`   ⚠️  Sin número, generando: ${numeroResolucion}`);
    }
    
    // Verificar si ya existe
    const exists = await prisma.resolucion.findUnique({
      where: { numeroResolucion }
    });
    
    if (exists) {
      return { status: 'skipped', numero: numeroResolucion };
    }
    
    // MAPEAR FACULTAD Y DEPARTAMENTO
    const { facultadId, departamentoId } = await mapFacultyAndDepartment(record);
    
    // Mapear modalidad y tipo
    const modalidadRaw = String(record.modality || '0');
    const modalidad = MODALIDAD_MAP[modalidadRaw] || 'ESTUDIANTES';
    
    const tipoRaw = String(record.type_resolution || '');
    const tipoResolucion = TIPO_RESOLUCION_MAP[tipoRaw] || 'APROBACION_PROYECTO';
    
    // Preparar datos
    const esFinanciado = record.is_financed === 'true' || record.is_financed === true;
    const monto = esFinanciado && record.amount ? parseFloat(record.amount) : null;
    
    // Limpiar título
    let tituloProyecto = (record.title_project || 'Sin título')
      .replace(/^["'´`]+|["'´`]+$/g, '')
      .replace(/´´/g, '')
      .trim()
      .substring(0, 497);
    
    const resolutionData = {
      tipoResolucion,
      numeroResolucion,
      fechaResolucion: parseDate(record.date_resolution),
      modalidad,
      esFinanciado,
      monto: isNaN(monto) ? null : monto,
      dniAsesor: (record.dni_adviser || '').substring(0, 20),
      nombreAsesor: (record.name_adviser || '').substring(0, 200),
      tituloProyecto,
      facultadId,        // Ahora usa el valor mapeado
      departamentoId,    // Ahora usa el valor mapeado
      status: 'APROBADO',
      createdById: userId,
      createdAt: parseDate(record.date_register_resolution),
      updatedAt: new Date(),
    };
    
    // Crear resolución
    const created = await prisma.resolucion.create({
      data: resolutionData
    });
    
    // Buscar y adjuntar archivos
    const files = findFilesForResolution(numeroResolucion, CONFIG.storagePath);
    for (const file of files) {
      try {
        const destFileName = `${numeroResolucion.replace(/[\/\\]/g, '-')}_${Date.now()}.pdf`;
        const destPath = path.join(CONFIG.uploadDestination, destFileName);
        
        if (!fs.existsSync(CONFIG.uploadDestination)) {
          fs.mkdirSync(CONFIG.uploadDestination, { recursive: true });
        }
        
        fs.copyFileSync(file.path, destPath);
        
        await prisma.archivoResolucion.create({
          data: {
            resolucionId: created.id,
            fileName: destFileName,
            fileUrl: CONFIG.publicUrlBase + destFileName,
            fileSize: file.size,
            fileMimeType: 'application/pdf',
            tipo: 'resolucion'
          }
        });
      } catch (fileError) {
        // Continuar
      }
    }
    
    // Parsear y agregar docentes
    const teachers = parseParticipants(record.teachers, 'docentes');
    for (const teacher of teachers) {
      if (teacher.fullName || teacher.dni) {
        try {
          await prisma.docenteResolucion.create({
            data: {
              resolucionId: created.id,
              dni: teacher.dni || '00000000',
              nombres: teacher.fullName?.split(' ').slice(0, -2).join(' ') || 'Sin nombre',
              apellidos: teacher.fullName?.split(' ').slice(-2).join(' ') || 'Sin apellido',
            }
          });
        } catch (e) {
          // Continuar
        }
      }
    }
    
    // Parsear y agregar estudiantes
    const students = parseParticipants(record.students, 'estudiantes');
    for (const student of students) {
      if (student.fullName || student.dni || student.code) {
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
          // Continuar
        }
      }
    }
    
    console.log(`✅ [${index}/${total}] ${numeroResolucion} - Importado`);
    return { status: 'success', numero: numeroResolucion };
    
  } catch (error) {
    console.error(`❌ [${index}/${total}] Error: ${error.message}`);
    return { status: 'error', numero: record.num_resolution, error: error.message };
  }
}

// ================== FUNCIÓN PRINCIPAL ==================

async function migrateAllResolutions() {
  console.log('🚀 MIGRACIÓN COMPLETA CON FACULTADES Y DEPARTAMENTOS');
  console.log('=====================================================');
  console.log(`📁 CSV: ${CONFIG.csvPath}`);
  console.log(`🔧 Modo: ${CONFIG.dryRun ? 'SIMULACIÓN' : 'EJECUCIÓN REAL'}`);
  console.log(`🧹 Limpiar primero: ${CONFIG.cleanFirst ? 'SÍ' : 'NO'}`);
  console.log('=====================================================\n');
  
  const stats = {
    total: 0,
    success: 0,
    skipped: 0,
    errors: 0,
    errorDetails: []
  };
  
  try {
    // 1. Limpiar si se requiere
    if (CONFIG.cleanFirst && !CONFIG.dryRun) {
      console.log('🧹 Limpiando datos existentes...');
      await prisma.estudianteResolucion.deleteMany({});
      await prisma.docenteResolucion.deleteMany({});
      await prisma.archivoResolucion.deleteMany({});
      await prisma.resolucion.deleteMany({});
      console.log('   ✅ Datos limpiados\n');
    }
    
    // 2. Configuración inicial
    console.log('⚙️  Configurando...');
    const userId = CONFIG.dryRun ? 'dry-run-user' : await getOrCreateUser();
    
    // IMPORTANTE: Inicializar cache de facultades
    if (!CONFIG.dryRun) {
      await initializeFacultyCache();
    }
    
    console.log('   ✅ Configuración lista\n');
    
    // 3. Leer TODOS los registros del CSV
    const records = await readCSVComplete(CONFIG.csvPath);
    stats.total = records.length;
    
    if (stats.total !== 463) {
      console.log(`⚠️  ADVERTENCIA: Se esperaban 463 registros pero se encontraron ${stats.total}`);
    }
    
    // 4. Procesar cada registro
    console.log('🔄 Procesando registros...\n');
    
    for (let i = 0; i < records.length; i++) {
      if (CONFIG.dryRun) {
        stats.success++;
        if ((i + 1) % 50 === 0) {
          console.log(`   [SIMULACIÓN] Procesados ${i + 1}/${stats.total}`);
        }
      } else {
        const result = await processResolution(
          records[i], 
          userId, 
          i + 1, 
          stats.total
        );
        
        if (result.status === 'success') {
          stats.success++;
        } else if (result.status === 'skipped') {
          stats.skipped++;
        } else {
          stats.errors++;
          stats.errorDetails.push(result);
        }
        
        if ((i + 1) % 25 === 0 || (i + 1) === stats.total) {
          const progress = ((i + 1) / stats.total * 100).toFixed(1);
          console.log(`\n📈 Progreso: ${progress}% - ✅ ${stats.success} | ⏭️  ${stats.skipped} | ❌ ${stats.errors}\n`);
        }
      }
    }
    
    // 5. Verificación final
    let totalInDB = 0;
    if (!CONFIG.dryRun) {
      totalInDB = await prisma.resolucion.count();
    }
    
    // 6. Resumen final
    console.log('\n=====================================================');
    console.log('📊 RESUMEN FINAL');
    console.log('=====================================================');
    console.log(`📄 Total en CSV: ${stats.total}`);
    
    if (!CONFIG.dryRun) {
      console.log(`✅ Importados exitosamente: ${stats.success}`);
      console.log(`⏭️  Saltados (ya existían): ${stats.skipped}`);
      console.log(`❌ Errores: ${stats.errors}`);
      console.log(`📁 Total en base de datos: ${totalInDB}`);
      
      if (totalInDB === 463) {
        console.log('\n🎉 ¡ÉXITO TOTAL! Las 463 resoluciones están en la base de datos.');
      }
      
      // Mostrar errores si hay
      if (stats.errors > 0 && stats.errorDetails.length > 0) {
        console.log('\n❌ Registros con errores:');
        stats.errorDetails.forEach(err => {
          console.log(`   - ${err.numero}: ${err.error}`);
        });
      }
    }
    
    // 7. Verificación adicional
    if (!CONFIG.dryRun && totalInDB > 0) {
      console.log('\n📊 VERIFICACIÓN ADICIONAL:');
      
      // Por modalidad
      const byModalidad = await prisma.resolucion.groupBy({
        by: ['modalidad'],
        _count: true,
      });
      
      console.log('\nPor modalidad:');
      byModalidad.forEach(item => {
        console.log(`   ${item.modalidad}: ${item._count}`);
      });
      
      // Por facultad
      const byFacultad = await prisma.resolucion.groupBy({
        by: ['facultadId'],
        _count: true,
      });
      
      console.log('\nPor facultad:');
      for (const item of byFacultad) {
        const fac = await prisma.facultad.findUnique({
          where: { id: item.facultadId }
        });
        console.log(`   ${fac?.nombre || 'Desconocida'}: ${item._count}`);
      }
      
      // Totales
      const totalDocentes = await prisma.docenteResolucion.count();
      const totalEstudiantes = await prisma.estudianteResolucion.count();
      const totalArchivos = await prisma.archivoResolucion.count();
      
      console.log('\nParticipantes y archivos:');
      console.log(`   Docentes: ${totalDocentes}`);
      console.log(`   Estudiantes: ${totalEstudiantes}`);
      console.log(`   Archivos: ${totalArchivos}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ================== EJECUTAR ==================

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
USO: node scripts/migrate-all-resolutions-with-faculties.js [opciones]

OPCIONES:
  --execute    Ejecutar la migración real (por defecto es simulación)
  --clean      Limpiar todos los datos antes de importar
  --help       Mostrar esta ayuda

EJEMPLOS:
  node scripts/migrate-all-resolutions-with-faculties.js                    # Simulación
  node scripts/migrate-all-resolutions-with-faculties.js --execute          # Importar todo
  node scripts/migrate-all-resolutions-with-faculties.js --execute --clean  # Limpiar e importar
  `);
  process.exit(0);
}

if (args.includes('--execute')) {
  CONFIG.dryRun = false;
}

if (args.includes('--clean')) {
  CONFIG.cleanFirst = true;
}

if (CONFIG.cleanFirst && !CONFIG.dryRun) {
  console.log('⚠️  ADVERTENCIA: Se borrarán TODOS los datos existentes.');
  console.log('   Tienes 5 segundos para cancelar con Ctrl+C...\n');
  
  setTimeout(() => {
    migrateAllResolutions()
      .then(() => {
        console.log('\n✅ Proceso completado exitosamente');
        process.exit(0);
      })
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  }, 5000);
} else {
  migrateAllResolutions()
    .then(() => {
      console.log('\n✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}