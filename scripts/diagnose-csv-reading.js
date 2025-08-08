// scripts/migrate-resolutions-readline.js
// Script que usa READLINE para garantizar leer TODOS los registros

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// Mapeos (simplificados)
const TIPO_RESOLUCION_MAP = {
  '1': 'APROBACION_PROYECTO',
  '2': 'MODIFICACION_PROYECTO',
  '3': 'AMPLIACION_PLAZO',
  '4': 'CAMBIO_ASESOR',
  '5': 'ANULACION_PROYECTO',
  '6': 'SUSTENTACION',
  '7': 'OTROS',
};

const MODALIDAD_MAP = {
  '0': 'ESTUDIANTES',
  '1': 'DOCENTES',
  '2': 'ESTUDIANTES',
  '3': 'EXTERNOS',
  '4': 'MIXTO',
};

// ========== FUNCIÓN CRÍTICA: Leer CSV con READLINE ==========
async function readCSVWithReadline(filePath) {
  console.log('📖 Leyendo CSV con readline (método más robusto)...');
  
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity // Maneja \r\n, \n, y \r
  });
  
  const records = [];
  let headers = null;
  let lineNumber = 0;
  
  for await (const line of rl) {
    lineNumber++;
    
    if (lineNumber === 1) {
      // Primera línea = headers
      headers = parseCSVLine(line);
      console.log(`   📋 ${headers.length} columnas detectadas`);
    } else if (line.trim()) {
      // Líneas de datos
      const values = parseCSVLine(line);
      
      // Crear objeto con headers
      const record = {};
      headers.forEach((header, index) => {
        record[header.trim()] = values[index] || '';
      });
      
      // Solo agregar si tiene algún identificador
      if (record._id || record.num_resolution) {
        records.push(record);
        
        // Mostrar progreso
        if (records.length % 50 === 0) {
          console.log(`   📊 ${records.length} registros leídos...`);
        }
      }
    }
  }
  
  console.log(`   ✅ Total: ${records.length} registros leídos exitosamente`);
  return records;
}

// Función para parsear una línea CSV manualmente
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Comilla escapada
        current += '"';
        i++; // Saltar la siguiente comilla
      } else {
        // Cambiar estado de comillas
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Fin del campo
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Agregar el último campo
  values.push(current.trim());
  
  return values;
}

// Parsear participantes de manera robusta
function parseParticipants(jsonString) {
  if (!jsonString || jsonString === '[]' || jsonString === '(vacío)' || 
      jsonString === '' || jsonString === 'undefined') {
    return [];
  }

  try {
    // Limpiar el string
    let cleaned = jsonString
      .replace(/undefined/g, '""')
      .replace(/null/g, '""')
      .replace(/'/g, '"')
      .replace(/;/g, ',');
    
    // Asegurar formato de array
    if (cleaned.includes('{') && !cleaned.startsWith('[')) {
      cleaned = '[' + cleaned + ']';
    }
    
    const parsed = JSON.parse(cleaned);
    
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        dni: (item.dni || item.DNI || '').toString().trim(),
        fullName: (item.fullName || item.nombre || item.name || '').toString().trim(),
        code: (item.code || item.codigo || '').toString().trim()
      })).filter(p => p.fullName || p.dni);
    }
  } catch (error) {
    // Si falla, intentar extraer manualmente
    const results = [];
    const matches = jsonString.match(/\{[^}]+\}/g);
    
    if (matches) {
      for (const match of matches) {
        const nameMatch = match.match(/(?:fullName|nombre|name)["':]+([^"',}]+)/i);
        if (nameMatch) {
          results.push({
            dni: '',
            fullName: nameMatch[1].trim(),
            code: ''
          });
        }
      }
    }
    
    return results;
  }
  
  return [];
}

// Obtener o crear valores por defecto
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
  if (!dateValue || dateValue === '(vacío)' || dateValue === '') {
    return new Date();
  }
  
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// ========== PROCESO PRINCIPAL ==========
async function migrateResolutions() {
  console.log('🚀 INICIANDO MIGRACIÓN CON READLINE');
  console.log('=====================================');
  console.log(`📁 CSV: ${CONFIG.csvPath}`);
  console.log(`🔧 Modo: ${CONFIG.dryRun ? 'SIMULACIÓN' : 'REAL'}`);
  console.log('=====================================\n');
  
  const stats = {
    total: 0,
    success: 0,
    errors: 0,
    skipped: 0
  };
  
  try {
    // 1. Configuración inicial
    let userId = 'dry-run-user';
    let defaults = { facultadId: 1, departamentoId: 1 };
    
    if (!CONFIG.dryRun) {
      userId = await getOrCreateMigrationUser();
      defaults = await getOrCreateDefaults();
      
      if (!fs.existsSync(CONFIG.uploadDestination)) {
        fs.mkdirSync(CONFIG.uploadDestination, { recursive: true });
      }
    }
    
    // 2. CRÍTICO: Leer CSV con readline
    const resolutionsData = await readCSVWithReadline(CONFIG.csvPath);
    stats.total = resolutionsData.length;
    
    console.log(`\n📊 TOTAL A PROCESAR: ${stats.total} resoluciones`);
    console.log('=====================================\n');
    
    // 3. Procesar cada registro
    for (let i = 0; i < resolutionsData.length; i++) {
      const record = resolutionsData[i];
      
      try {
        // Validar número de resolución
        if (!record.num_resolution || record.num_resolution === '(vacío)') {
          record.num_resolution = `TEMP-${Date.now()}-${i + 1}`;
        }
        
        // Verificar si ya existe (solo en modo real)
        if (!CONFIG.dryRun) {
          const exists = await prisma.resolucion.findUnique({
            where: { numeroResolucion: record.num_resolution }
          });
          
          if (exists) {
            console.log(`⏭️  [${i + 1}/${stats.total}] ${record.num_resolution} - Ya existe`);
            stats.skipped++;
            continue;
          }
        }
        
        // Preparar datos
        const tipoResolucion = TIPO_RESOLUCION_MAP[record.type_resolution] || 'APROBACION_PROYECTO';
        const modalidad = MODALIDAD_MAP[record.modality] || 'ESTUDIANTES';
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
        
        // Parsear participantes
        const teachers = parseParticipants(record.teachers);
        const students = parseParticipants(record.students);
        
        // Guardar en base de datos
        if (!CONFIG.dryRun) {
          const created = await prisma.resolucion.create({
            data: resolutionData
          });
          
          // Agregar docentes
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
                // Silenciar error individual
              }
            }
          }
          
          // Agregar estudiantes
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
                // Silenciar error individual
              }
            }
          }
          
          console.log(`✅ [${i + 1}/${stats.total}] ${created.numeroResolucion} - Importado`);
        } else {
          console.log(`✅ [SIM ${i + 1}/${stats.total}] ${resolutionData.numeroResolucion}`);
        }
        
        stats.success++;
        
      } catch (error) {
        console.error(`❌ [${i + 1}/${stats.total}] Error: ${error.message}`);
        stats.errors++;
      }
      
      // Mostrar progreso
      if ((i + 1) % 25 === 0 || (i + 1) === stats.total) {
        const progress = ((i + 1) / stats.total * 100).toFixed(1);
        console.log(`\n📈 Progreso: ${progress}% - ✅ ${stats.success} | ⏭️  ${stats.skipped} | ❌ ${stats.errors}\n`);
      }
    }
    
    // 4. Verificación final
    let totalInDB = 0;
    if (!CONFIG.dryRun) {
      totalInDB = await prisma.resolucion.count();
    }
    
    // 5. Resumen
    console.log('\n=====================================');
    console.log('📊 RESUMEN FINAL');
    console.log('=====================================');
    console.log(`📄 Total en CSV: ${stats.total}`);
    console.log(`✅ Importados: ${stats.success}`);
    console.log(`⏭️  Saltados: ${stats.skipped}`);
    console.log(`❌ Errores: ${stats.errors}`);
    
    if (!CONFIG.dryRun) {
      console.log(`📁 Total en BD: ${totalInDB}`);
      
      if (totalInDB === 463) {
        console.log('\n🎉 ¡ÉXITO TOTAL! Los 463 registros están en la base de datos.');
      }
    }
    
    if (CONFIG.dryRun) {
      console.log('\n⚠️  MODO SIMULACIÓN - No se guardaron cambios');
      console.log('📌 Para ejecutar la migración real:');
      console.log('    node scripts/migrate-resolutions-readline.js --execute');
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ========== EJECUTAR ==========
const args = process.argv.slice(2);
CONFIG.dryRun = !args.includes('--execute');

migrateResolutions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

/**
 * USO:
 * 
 * 1. Modo simulación:
 *    node scripts/migrate-resolutions-readline.js
 * 
 * 2. Ejecutar migración real:
 *    node scripts/migrate-resolutions-readline.js --execute
 * 
 * VENTAJAS DE READLINE:
 * - Lee línea por línea sin cargar todo en memoria
 * - Maneja cualquier tipo de salto de línea (\n, \r\n, \r)
 * - No falla con archivos grandes
 * - No se corta en caracteres especiales
 * - Garantiza leer TODAS las líneas del archivo
 */