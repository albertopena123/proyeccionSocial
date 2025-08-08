// scripts/analyze-resolutions.js
// Script para analizar el CSV de resoluciones y preparar la migración

const fs = require('fs');
const csv = require('csv-parser');
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
  magenta: '\x1b[35m',
};

async function analyzeResolutionsCSV() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   ANÁLISIS DE CSV DE RESOLUCIONES     ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(colors.reset);
  
  const csvPath = './firestore-backups/resolutions-2025-08-08.csv';
  const storageBackupPath = './storage-backups/resolutions';
  const uploadPath = './public/uploads/resoluciones';
  
  // Verificar que existe el CSV
  if (!fs.existsSync(csvPath)) {
    console.error(`${colors.red}❌ No se encontró el archivo CSV: ${csvPath}${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Archivo CSV encontrado${colors.reset}: ${csvPath}`);
  
  // Verificar carpeta de archivos
  if (fs.existsSync(storageBackupPath)) {
    const files = fs.readdirSync(storageBackupPath);
    console.log(`${colors.green}✅ Carpeta de archivos encontrada${colors.reset}: ${storageBackupPath}`);
    console.log(`   📁 ${files.length} archivos en la carpeta`);
  } else {
    console.log(`${colors.yellow}⚠️  No se encontró carpeta de archivos${colors.reset}: ${storageBackupPath}`);
  }
  
  // Verificar/crear carpeta de destino
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`${colors.green}✅ Carpeta de destino creada${colors.reset}: ${uploadPath}`);
  } else {
    console.log(`${colors.cyan}ℹ️  Carpeta de destino ya existe${colors.reset}: ${uploadPath}`);
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log(`${colors.bright}📊 ANALIZANDO ESTRUCTURA DEL CSV${colors.reset}`);
  console.log('═══════════════════════════════════════\n');
  
  const records = [];
  let headers = null;
  
  // Leer el CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('headers', (hdrs) => {
        headers = hdrs;
      })
      .on('data', (data) => {
        records.push(data);
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  // Mostrar headers
  console.log(`${colors.cyan}📋 HEADERS ENCONTRADOS (${headers.length} campos):${colors.reset}`);
  console.log('─'.repeat(50));
  headers.forEach((header, index) => {
    console.log(`  [${index}] ${header}`);
  });
  
  // Mostrar estadísticas
  console.log(`\n${colors.cyan}📊 ESTADÍSTICAS:${colors.reset}`);
  console.log('─'.repeat(50));
  console.log(`  Total de resoluciones: ${records.length}`);
  
  // Analizar tipos de datos
  if (records.length > 0) {
    console.log(`\n${colors.cyan}🔍 PRIMER REGISTRO (muestra de datos):${colors.reset}`);
    console.log('─'.repeat(50));
    const firstRecord = records[0];
    Object.entries(firstRecord).forEach(([key, value]) => {
      const displayValue = value ? 
        (String(value).length > 60 ? String(value).substring(0, 60) + '...' : value) : 
        '(vacío)';
      console.log(`  ${colors.yellow}${key}${colors.reset}: ${displayValue}`);
    });
    
    // Analizar campos importantes para el mapeo
    console.log(`\n${colors.cyan}🎯 CAMPOS CLAVE PARA MIGRACIÓN:${colors.reset}`);
    console.log('─'.repeat(50));
    
    // Buscar campos relacionados con número de resolución
    const resolutionNumberFields = headers.filter(h => 
      h.toLowerCase().includes('resol') || 
      h.toLowerCase().includes('number') ||
      h.toLowerCase().includes('numero')
    );
    console.log(`\n${colors.magenta}Número de resolución:${colors.reset}`);
    resolutionNumberFields.forEach(field => {
      const values = records.slice(0, 3).map(r => r[field]).filter(v => v);
      console.log(`  - ${field}: ${values.join(', ')}`);
    });
    
    // Buscar campos de fecha
    const dateFields = headers.filter(h => 
      h.toLowerCase().includes('date') || 
      h.toLowerCase().includes('fecha') ||
      h.toLowerCase().includes('created') ||
      h.toLowerCase().includes('register')
    );
    console.log(`\n${colors.magenta}Fechas:${colors.reset}`);
    dateFields.forEach(field => {
      const value = records[0][field];
      console.log(`  - ${field}: ${value}`);
    });
    
    // Buscar campos de archivos/URLs
    const fileFields = headers.filter(h => 
      h.toLowerCase().includes('url') || 
      h.toLowerCase().includes('file') ||
      h.toLowerCase().includes('archivo') ||
      h.toLowerCase().includes('document')
    );
    console.log(`\n${colors.magenta}Archivos/URLs:${colors.reset}`);
    fileFields.forEach(field => {
      const value = records[0][field];
      const preview = value ? 
        (value.length > 80 ? value.substring(0, 80) + '...' : value) : 
        '(vacío)';
      console.log(`  - ${field}: ${preview}`);
    });
    
    // Buscar campos de personas (docentes/estudiantes)
    const personFields = headers.filter(h => 
      h.toLowerCase().includes('docent') || 
      h.toLowerCase().includes('estudiant') ||
      h.toLowerCase().includes('asesor') ||
      h.toLowerCase().includes('alumno') ||
      h.toLowerCase().includes('profesor') ||
      h.toLowerCase().includes('dni') ||
      h.toLowerCase().includes('nombre')
    );
    console.log(`\n${colors.magenta}Personas (docentes/estudiantes):${colors.reset}`);
    personFields.forEach(field => {
      const value = records[0][field];
      const preview = value ? 
        (String(value).length > 60 ? String(value).substring(0, 60) + '...' : value) : 
        '(vacío)';
      console.log(`  - ${field}: ${preview}`);
    });
    
    // Buscar campos de proyecto
    const projectFields = headers.filter(h => 
      h.toLowerCase().includes('project') || 
      h.toLowerCase().includes('proyecto') ||
      h.toLowerCase().includes('titulo') ||
      h.toLowerCase().includes('title')
    );
    console.log(`\n${colors.magenta}Proyecto:${colors.reset}`);
    projectFields.forEach(field => {
      const value = records[0][field];
      const preview = value ? 
        (String(value).length > 80 ? String(value).substring(0, 80) + '...' : value) : 
        '(vacío)';
      console.log(`  - ${field}: ${preview}`);
    });
    
    // Analizar valores únicos de campos importantes
    console.log(`\n${colors.cyan}📈 ANÁLISIS DE VALORES ÚNICOS:${colors.reset}`);
    console.log('─'.repeat(50));
    
    // Analizar tipos de resolución si existe ese campo
    const typeFields = headers.filter(h => 
      h.toLowerCase().includes('type') || 
      h.toLowerCase().includes('tipo') ||
      h.toLowerCase().includes('modalidad')
    );
    
    typeFields.forEach(field => {
      const uniqueValues = [...new Set(records.map(r => r[field]).filter(v => v))];
      console.log(`\n${field} (${uniqueValues.length} valores únicos):`);
      uniqueValues.slice(0, 10).forEach(v => {
        const count = records.filter(r => r[field] === v).length;
        console.log(`  - ${v}: ${count} registros`);
      });
    });
    
    // Contar registros con archivos
    let recordsWithFiles = 0;
    fileFields.forEach(field => {
      const withFile = records.filter(r => r[field] && r[field] !== '(vacío)' && r[field] !== '').length;
      if (withFile > 0) {
        recordsWithFiles = Math.max(recordsWithFiles, withFile);
      }
    });
    
    console.log(`\n${colors.cyan}📎 ARCHIVOS:${colors.reset}`);
    console.log('─'.repeat(50));
    console.log(`  Resoluciones con archivos: ${recordsWithFiles}/${records.length}`);
    
    // Verificar estructura de datos para docentes/estudiantes
    console.log(`\n${colors.cyan}👥 ESTRUCTURA DE PARTICIPANTES:${colors.reset}`);
    console.log('─'.repeat(50));
    
    // Ver si los datos de participantes están en JSON o separados
    const sampleParticipants = records.slice(0, 3);
    sampleParticipants.forEach((record, index) => {
      console.log(`\nRegistro ${index + 1}:`);
      personFields.forEach(field => {
        const value = record[field];
        if (value) {
          try {
            // Intentar parsear como JSON
            const parsed = JSON.parse(value);
            console.log(`  ${field}: [JSON Array con ${parsed.length} elementos]`);
          } catch {
            // No es JSON, mostrar como está
            const preview = value.length > 60 ? value.substring(0, 60) + '...' : value;
            console.log(`  ${field}: ${preview}`);
          }
        }
      });
    });
  }
  
  // Verificar conexión a base de datos
  console.log(`\n${colors.cyan}🗄️  VERIFICANDO BASE DE DATOS:${colors.reset}`);
  console.log('─'.repeat(50));
  
  try {
    await prisma.$connect();
    console.log(`${colors.green}✅ Conexión a PostgreSQL exitosa${colors.reset}`);
    
    // Verificar tablas relacionadas
    const resolucionCount = await prisma.resolucion.count();
    const facultadCount = await prisma.facultad.count();
    const departamentoCount = await prisma.departamento.count();
    
    console.log(`\n📊 Estado actual de las tablas:`);
    console.log(`  - Resoluciones: ${resolucionCount} registros`);
    console.log(`  - Facultades: ${facultadCount} registros`);
    console.log(`  - Departamentos: ${departamentoCount} registros`);
    
    if (facultadCount === 0) {
      console.log(`\n${colors.yellow}⚠️  No hay facultades en la DB${colors.reset}`);
      console.log(`   Necesitarás crear las facultades antes de migrar`);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error(`${colors.red}❌ Error conectando a la base de datos${colors.reset}`);
    console.error(error.message);
  }
  
  // Recomendaciones finales
  console.log(`\n${colors.bright}${colors.green}════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}💡 PRÓXIMOS PASOS:${colors.reset}`);
  console.log(`${colors.green}════════════════════════════════════════${colors.reset}`);
  console.log('\n1. Revisa los headers y campos mostrados arriba');
  console.log('2. Ajusta el mapeo de campos en el script de migración');
  console.log('3. Si hay facultades/departamentos, asegúrate de crearlos primero');
  console.log('4. Ejecuta la migración en modo simulación');
  console.log('5. Revisa los resultados y ejecuta la migración real');
  
  console.log(`\n${colors.cyan}📝 Para crear el script de migración, necesitamos mapear:${colors.reset}`);
  console.log('   - tipoResolucion (APROBACION_PROYECTO o APROBACION_INFORME_FINAL)');
  console.log('   - numeroResolucion (único)');
  console.log('   - fechaResolucion');
  console.log('   - modalidad (DOCENTES, ESTUDIANTES, VOLUNTARIADO, ACTIVIDAD)');
  console.log('   - dniAsesor y nombreAsesor');
  console.log('   - tituloProyecto');
  console.log('   - Lista de docentes participantes');
  console.log('   - Lista de estudiantes participantes');
  
  process.exit(0);
}

// Ejecutar análisis
analyzeResolutionsCSV().catch(console.error);