// scripts/find-missing-resolutions.js
// Script para identificar las 3 resoluciones que fallaron en la importación

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const readline = require('readline');

const prisma = new PrismaClient();

const CONFIG = {
  csvPath: './firestore-backups/resolutions-2025-08-08.csv'
};

// Función para leer CSV con readline
async function readCSVWithReadline(filePath) {
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
    } else if (line.trim()) {
      const values = parseCSVLine(line);
      const record = {};
      headers.forEach((header, index) => {
        record[header.trim()] = values[index] || '';
      });
      
      if (record._id || record.num_resolution) {
        record.lineNumber = lineNumber; // Guardar número de línea
        records.push(record);
      }
    }
  }
  
  return records;
}

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

async function findMissingResolutions() {
  console.log('🔍 BUSCANDO RESOLUCIONES FALTANTES');
  console.log('=====================================\n');
  
  try {
    // 1. Leer todas las resoluciones del CSV
    console.log('📖 Leyendo CSV...');
    const csvRecords = await readCSVWithReadline(CONFIG.csvPath);
    console.log(`   ✅ ${csvRecords.length} registros en CSV\n`);
    
    // 2. Obtener todas las resoluciones de la BD
    console.log('📊 Consultando base de datos...');
    const dbResolutions = await prisma.resolucion.findMany({
      select: { numeroResolucion: true }
    });
    console.log(`   ✅ ${dbResolutions.length} registros en BD\n`);
    
    // 3. Crear Set de números en BD para búsqueda rápida
    const dbNumbers = new Set(dbResolutions.map(r => r.numeroResolucion));
    
    // 4. Encontrar las que faltan
    const missing = [];
    const duplicatesInCSV = {};
    
    for (const record of csvRecords) {
      const numero = record.num_resolution;
      
      // Verificar duplicados en CSV
      if (duplicatesInCSV[numero]) {
        duplicatesInCSV[numero].push(record.lineNumber);
      } else {
        duplicatesInCSV[numero] = [record.lineNumber];
      }
      
      // Verificar si está en BD
      if (!dbNumbers.has(numero)) {
        missing.push({
          lineNumber: record.lineNumber,
          numero: numero || 'SIN NÚMERO',
          titulo: record.title_project || 'Sin título',
          fecha: record.date_resolution || 'Sin fecha',
          asesor: record.name_adviser || 'Sin asesor',
          modalidad: record.modality,
          _id: record._id
        });
      }
    }
    
    // 5. Mostrar resultados
    console.log('📊 RESULTADOS:');
    console.log('=====================================');
    console.log(`✅ Importados correctamente: ${dbResolutions.length}`);
    console.log(`❌ Faltantes: ${missing.length}\n`);
    
    if (missing.length > 0) {
      console.log('🔴 RESOLUCIONES FALTANTES:');
      console.log('─────────────────────────\n');
      
      missing.forEach((record, index) => {
        console.log(`${index + 1}. LÍNEA ${record.lineNumber} en CSV:`);
        console.log(`   Número: ${record.numero}`);
        console.log(`   Título: ${record.titulo.substring(0, 60)}...`);
        console.log(`   Fecha: ${record.fecha}`);
        console.log(`   Asesor: ${record.asesor}`);
        console.log(`   Modalidad: ${record.modalidad}`);
        console.log(`   ID Firebase: ${record._id}`);
        console.log('');
      });
      
      // Verificar si hay duplicados en el CSV
      const duplicateNumbers = Object.entries(duplicatesInCSV)
        .filter(([num, lines]) => lines.length > 1);
      
      if (duplicateNumbers.length > 0) {
        console.log('⚠️  NÚMEROS DUPLICADOS EN CSV:');
        console.log('─────────────────────────\n');
        duplicateNumbers.forEach(([num, lines]) => {
          console.log(`   "${num}" aparece en líneas: ${lines.join(', ')}`);
        });
        console.log('');
      }
      
      // Crear script SQL para insertar manualmente
      console.log('💡 SOLUCIÓN MANUAL:');
      console.log('─────────────────────────\n');
      console.log('Opción 1: Insertar manualmente estos registros');
      console.log('Opción 2: Ejecutar el siguiente código:\n');
      
      // Generar código para insertar los faltantes
      console.log('```javascript');
      console.log('// Código para insertar los registros faltantes');
      console.log('const { PrismaClient } = require("@prisma/client");');
      console.log('const prisma = new PrismaClient();\n');
      console.log('async function insertMissing() {');
      console.log('  const missing = [');
      
      missing.forEach(record => {
        // Buscar el registro completo en csvRecords
        const fullRecord = csvRecords.find(r => r.lineNumber === record.lineNumber);
        
        console.log('    {');
        console.log(`      numeroResolucion: "${record.numero}",`);
        console.log(`      tituloProyecto: ${JSON.stringify(record.titulo.substring(0, 497))},`);
        console.log(`      fechaResolucion: new Date("${record.fecha || new Date().toISOString()}"),`);
        console.log(`      nombreAsesor: "${record.asesor}",`);
        console.log(`      dniAsesor: "${fullRecord?.dni_adviser || ''}",`);
        console.log(`      modalidad: "${fullRecord?.modality === '0' ? 'ESTUDIANTES' : 'DOCENTES'}",`);
        console.log(`      tipoResolucion: "APROBACION_PROYECTO",`);
        console.log(`      status: "APROBADO",`);
        console.log(`      esFinanciado: ${fullRecord?.is_financed === 'true'},`);
        console.log(`      // Ajustar estos IDs según tu BD`);
        console.log(`      facultadId: 1,`);
        console.log(`      departamentoId: 1,`);
        console.log(`      createdById: "USER_ID_AQUI"`);
        console.log('    },');
      });
      
      console.log('  ];\n');
      console.log('  for (const data of missing) {');
      console.log('    try {');
      console.log('      await prisma.resolucion.create({ data });');
      console.log('      console.log(`✅ Insertado: ${data.numeroResolucion}`);');
      console.log('    } catch (error) {');
      console.log('      console.error(`❌ Error con ${data.numeroResolucion}:`, error.message);');
      console.log('    }');
      console.log('  }');
      console.log('}');
      console.log('\ninsertMissing().then(() => process.exit(0));');
      console.log('```\n');
      
      // Analizar posibles causas
      console.log('🔍 ANÁLISIS DE POSIBLES CAUSAS:');
      console.log('─────────────────────────\n');
      
      // Verificar si tienen números problemáticos
      const problematicNumbers = missing.filter(m => 
        !m.numero || 
        m.numero === 'SIN NÚMERO' || 
        m.numero === '(vacío)' ||
        m.numero.includes('/') ||
        m.numero.includes('\\')
      );
      
      if (problematicNumbers.length > 0) {
        console.log(`❌ ${problematicNumbers.length} registro(s) con números problemáticos:`);
        problematicNumbers.forEach(p => {
          console.log(`   - Línea ${p.lineNumber}: "${p.numero}"`);
        });
        console.log('');
      }
      
      // Verificar si son duplicados
      const possibleDuplicates = [];
      for (const m of missing) {
        if (duplicatesInCSV[m.numero] && duplicatesInCSV[m.numero].length > 1) {
          possibleDuplicates.push(m);
        }
      }
      
      if (possibleDuplicates.length > 0) {
        console.log(`⚠️  ${possibleDuplicates.length} registro(s) tienen números duplicados en CSV`);
        console.log('   Es posible que solo se haya insertado uno de los duplicados\n');
      }
      
      // Verificar registros muy recientes
      const recentDates = missing.filter(m => {
        const date = new Date(m.fecha);
        return date > new Date('2025-01-01');
      });
      
      if (recentDates.length > 0) {
        console.log(`📅 ${recentDates.length} registro(s) son muy recientes (2025)`);
        console.log('   Podrían tener restricciones de fecha\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
findMissingResolutions()
  .then(() => {
    console.log('✅ Análisis completado');
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });