// scripts/analyze-resolutions-gap.js
// Script para analizar las diferencias entre el CSV y los datos esperados

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

const prisma = new PrismaClient();

// Configuración
const CONFIG = {
  csvPath: './firestore-backups/resolutions-2025-08-08.csv',
  backupFolder: './firestore-backups/',
};

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

async function analyzeResolutions() {
  console.log('🔍 ANÁLISIS DE RESOLUCIONES');
  console.log('=====================================\n');
  
  try {
    // 1. Verificar archivos CSV disponibles
    console.log('📁 ARCHIVOS CSV EN BACKUP:');
    console.log('------------------------');
    
    if (fs.existsSync(CONFIG.backupFolder)) {
      const files = fs.readdirSync(CONFIG.backupFolder);
      const csvFiles = files.filter(f => f.includes('resolution') && f.endsWith('.csv'));
      
      for (const file of csvFiles) {
        const filePath = `${CONFIG.backupFolder}${file}`;
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        
        // Contar líneas rápidamente
        const content = fs.readFileSync(filePath, 'utf8');
        const lineCount = content.split('\n').length - 1; // -1 para el header
        
        console.log(`   📄 ${file}`);
        console.log(`      Tamaño: ${sizeKB} KB`);
        console.log(`      Líneas: ~${lineCount}`);
        
        // Leer y analizar el CSV
        if (file === 'resolutions-2025-08-08.csv') {
          const data = await readCSV(filePath);
          console.log(`      ✅ Registros válidos: ${data.length}`);
          
          // Verificar si hay registros vacíos o corruptos
          let emptyRecords = 0;
          let noResolutionNumber = 0;
          const duplicates = {};
          const years = {};
          
          data.forEach(record => {
            // Verificar registros vacíos
            if (!record.num_resolution && !record._id) {
              emptyRecords++;
            }
            
            // Verificar sin número de resolución
            if (!record.num_resolution || record.num_resolution === '(vacío)') {
              noResolutionNumber++;
            }
            
            // Buscar duplicados
            const num = record.num_resolution || record._id;
            if (num) {
              duplicates[num] = (duplicates[num] || 0) + 1;
            }
            
            // Analizar años
            if (record.date_resolution) {
              const date = new Date(record.date_resolution);
              const year = date.getFullYear();
              if (!isNaN(year) && year > 2000 && year < 2030) {
                years[year] = (years[year] || 0) + 1;
              }
            }
          });
          
          // Mostrar problemas encontrados
          if (emptyRecords > 0) {
            console.log(`      ⚠️  Registros vacíos: ${emptyRecords}`);
          }
          if (noResolutionNumber > 0) {
            console.log(`      ⚠️  Sin número de resolución: ${noResolutionNumber}`);
          }
          
          // Mostrar duplicados
          const duplicatesList = Object.entries(duplicates).filter(([k, v]) => v > 1);
          if (duplicatesList.length > 0) {
            console.log(`      ⚠️  Números duplicados: ${duplicatesList.length}`);
            duplicatesList.slice(0, 5).forEach(([num, count]) => {
              console.log(`         - ${num}: ${count} veces`);
            });
          }
          
          // Mostrar distribución por años
          console.log(`\n      📅 Distribución por años:`);
          Object.entries(years).sort(([a], [b]) => a - b).forEach(([year, count]) => {
            console.log(`         ${year}: ${count} resoluciones`);
          });
          
          // Buscar rangos de números de resolución
          console.log(`\n      🔢 Análisis de números de resolución:`);
          const numbers = data
            .map(r => r.num_resolution)
            .filter(n => n && n !== '(vacío)')
            .map(n => {
              // Extraer solo números
              const match = n.match(/\d+/);
              return match ? parseInt(match[0]) : null;
            })
            .filter(n => n !== null)
            .sort((a, b) => a - b);
          
          if (numbers.length > 0) {
            console.log(`         Menor: ${numbers[0]}`);
            console.log(`         Mayor: ${numbers[numbers.length - 1]}`);
            console.log(`         Total únicos: ${new Set(numbers).size}`);
            
            // Buscar gaps en la numeración
            const gaps = [];
            for (let i = 1; i < numbers.length; i++) {
              if (numbers[i] - numbers[i-1] > 1) {
                gaps.push({
                  from: numbers[i-1],
                  to: numbers[i],
                  missing: numbers[i] - numbers[i-1] - 1
                });
              }
            }
            
            if (gaps.length > 0) {
              console.log(`         ⚠️  Gaps encontrados: ${gaps.length}`);
              const totalMissing = gaps.reduce((sum, g) => sum + g.missing, 0);
              console.log(`         ⚠️  Total faltantes en gaps: ${totalMissing}`);
              
              // Mostrar los gaps más grandes
              gaps.sort((a, b) => b.missing - a.missing).slice(0, 5).forEach(gap => {
                console.log(`            Gap: ${gap.from} → ${gap.to} (faltan ${gap.missing})`);
              });
            }
          }
        }
      }
      
      if (csvFiles.length === 0) {
        console.log('   ❌ No se encontraron archivos CSV de resoluciones');
      }
    }
    
    // 2. Comparar con la base de datos actual
    console.log('\n\n📊 COMPARACIÓN CON BASE DE DATOS:');
    console.log('------------------------');
    
    const dbCount = await prisma.resolucion.count();
    console.log(`   Base de datos actual: ${dbCount} resoluciones`);
    
    // Leer el CSV principal
    const csvData = await readCSV(CONFIG.csvPath);
    console.log(`   CSV principal: ${csvData.length} registros`);
    
    const difference = 463 - csvData.length; // 463 es el número esperado
    console.log(`   ⚠️  Diferencia con sistema real: ${difference} resoluciones`);
    
    // 3. Buscar resoluciones que están en BD pero no en CSV
    if (dbCount > 0) {
      const dbResolutions = await prisma.resolucion.findMany({
        select: { numeroResolucion: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
      
      const csvNumbers = new Set(csvData.map(r => r.num_resolution).filter(n => n && n !== '(vacío)'));
      const dbNumbers = new Set(dbResolutions.map(r => r.numeroResolucion));
      
      // Encontrar los que están en BD pero no en CSV
      const inDbNotInCsv = [...dbNumbers].filter(n => !csvNumbers.has(n));
      
      if (inDbNotInCsv.length > 0) {
        console.log(`\n   🔍 Resoluciones en BD pero no en CSV: ${inDbNotInCsv.length}`);
        console.log('   Ejemplos:');
        inDbNotInCsv.slice(0, 10).forEach(num => {
          console.log(`      - ${num}`);
        });
      }
    }
    
    // 4. Identificar los 3 errores del proceso de migración
    console.log('\n\n❌ ANÁLISIS DE ERRORES DE MIGRACIÓN:');
    console.log('------------------------');
    
    // Buscar registros problemáticos en el CSV
    const problematicRecords = [];
    csvData.forEach((record, index) => {
      const problems = [];
      
      // Sin número de resolución
      if (!record.num_resolution || record.num_resolution === '(vacío)') {
        problems.push('Sin número de resolución');
      }
      
      // Título muy largo
      if (record.title_project && record.title_project.length > 500) {
        problems.push(`Título muy largo (${record.title_project.length} caracteres)`);
      }
      
      // Fecha inválida
      if (record.date_resolution) {
        const date = new Date(record.date_resolution);
        if (isNaN(date.getTime())) {
          problems.push('Fecha inválida');
        }
      }
      
      // JSON mal formateado en participantes
      if (record.teachers && record.teachers !== '[]' && record.teachers !== '(vacío)') {
        try {
          JSON.parse(record.teachers.replace(/'/g, '"'));
        } catch {
          problems.push('JSON de docentes mal formateado');
        }
      }
      
      if (record.students && record.students !== '[]' && record.students !== '(vacío)') {
        try {
          JSON.parse(record.students.replace(/'/g, '"'));
        } catch {
          problems.push('JSON de estudiantes mal formateado');
        }
      }
      
      if (problems.length > 0) {
        problematicRecords.push({
          index: index + 2, // +2 por el header y porque los índices empiezan en 0
          numero: record.num_resolution || record._id || 'SIN NÚMERO',
          problems
        });
      }
    });
    
    if (problematicRecords.length > 0) {
      console.log(`   Total de registros problemáticos: ${problematicRecords.length}`);
      console.log('   Primeros 10:');
      problematicRecords.slice(0, 10).forEach(record => {
        console.log(`\n   Línea ${record.index}: ${record.numero}`);
        record.problems.forEach(p => {
          console.log(`      - ${p}`);
        });
      });
    }
    
    // 5. Sugerencias
    console.log('\n\n💡 SUGERENCIAS:');
    console.log('------------------------');
    
    console.log('1. Verificar si hay otros archivos CSV de respaldo con más datos');
    console.log('2. Revisar si las 116 resoluciones faltantes se crearon después del backup');
    console.log('3. Verificar en Firebase/Firestore si hay más datos');
    console.log('4. Los 3 errores probablemente son registros sin número de resolución o con datos corruptos');
    
    // 6. Buscar patrones en fechas para identificar cuándo se hizo el backup
    console.log('\n\n📅 ANÁLISIS TEMPORAL:');
    console.log('------------------------');
    
    const dates = csvData
      .map(r => r.date_register_resolution)
      .filter(d => d && d !== '(vacío)')
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => b - a);
    
    if (dates.length > 0) {
      console.log(`   Primera resolución: ${dates[dates.length - 1].toLocaleDateString()}`);
      console.log(`   Última resolución: ${dates[0].toLocaleDateString()}`);
      console.log(`   \n   ⚠️  El backup parece ser del ${dates[0].toLocaleDateString()}`);
      console.log(`   Las 116 resoluciones faltantes probablemente se crearon después de esta fecha`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
analyzeResolutions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });