// scripts/clean-participants-data.js
// Script para limpiar los datos mal formateados de docentes y estudiantes

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función para extraer número de documento (DNI, CE, RUC, Pasaporte, etc.)
function extractDocumentNumber(text) {
  if (!text) return '';
  
  // Primero intentar encontrar un DNI (8 dígitos)
  const dniMatch = text.match(/\b\d{8}\b/);
  if (dniMatch) return dniMatch[0];
  
  // Luego buscar RUC (11 dígitos)
  const rucMatch = text.match(/\b\d{11}\b/);
  if (rucMatch) return rucMatch[0];
  
  // Buscar Carnet de Extranjería (9 dígitos) o similar
  const ceMatch = text.match(/\b\d{9}\b/);
  if (ceMatch) return ceMatch[0];
  
  // Buscar cualquier secuencia de 7-12 dígitos
  const genericMatch = text.match(/\b\d{7,12}\b/);
  if (genericMatch) return genericMatch[0];
  
  // Si no hay solo números, buscar alfanumérico (para pasaportes)
  const alphaNumMatch = text.match(/\b[A-Z0-9]{6,12}\b/i);
  if (alphaNumMatch) return alphaNumMatch[0];
  
  return '';
}

// Función para extraer código de estudiante
function extractCode(text) {
  if (!text) return '';
  // Si tiene formato "16241002;fullName:..." extraer solo el número
  const match = text.match(/^(\d+)[;,]/);
  if (match) return match[1];
  // Si es solo números
  const numMatch = text.match(/\b\d{8,10}\b/);
  return numMatch ? numMatch[0] : text;
}

// Función para limpiar nombres/apellidos
function cleanName(text) {
  if (!text) return '';
  // Remover todo después de ;dni: o ;code: o ;fullName:
  let cleaned = text.split(';')[0];
  // Remover patrones como dni:, code:, fullName:
  cleaned = cleaned.replace(/\b(dni|code|fullName|codigo|DNI)[:]*\s*/gi, '');
  // Remover números de documento (8-11 dígitos típicamente)
  cleaned = cleaned.replace(/\b\d{8,11}\b/g, '');
  // Remover caracteres especiales extras
  cleaned = cleaned.replace(/[;:,]+$/, '');
  // Limpiar espacios múltiples
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

// Función para separar nombres y apellidos correctamente
function splitFullName(fullName) {
  if (!fullName) return { nombres: '', apellidos: '' };
  
  // Limpiar el nombre
  let cleaned = cleanName(fullName);
  
  // Dividir por espacios
  const parts = cleaned.split(/\s+/).filter(p => p);
  
  if (parts.length === 0) {
    return { nombres: '', apellidos: '' };
  } else if (parts.length === 1) {
    return { nombres: parts[0], apellidos: '' };
  } else if (parts.length === 2) {
    return { nombres: parts[0], apellidos: parts[1] };
  } else if (parts.length === 3) {
    return { nombres: parts[0], apellidos: `${parts[1]} ${parts[2]}` };
  } else {
    // Si hay 4 o más palabras, asumimos mitad nombres y mitad apellidos
    const midPoint = Math.floor(parts.length / 2);
    return {
      nombres: parts.slice(0, midPoint).join(' '),
      apellidos: parts.slice(midPoint).join(' ')
    };
  }
}

async function cleanDocentesData() {
  console.log('🧹 LIMPIANDO DATOS DE DOCENTES');
  console.log('================================\n');
  
  const docentes = await prisma.docenteResolucion.findMany();
  console.log(`📊 Total de docentes a revisar: ${docentes.length}`);
  
  let cleaned = 0;
  let errors = 0;
  
  for (const docente of docentes) {
    try {
      let needsUpdate = false;
      const updates = {};
      
      // Verificar y limpiar DNI
      const dniHasExtra = docente.dni && (
        docente.dni.includes(';') || 
        docente.dni.includes('fullName') ||
        docente.dni.includes(':') ||
        docente.dni.length > 8
      );
      
      if (dniHasExtra) {
        const cleanDni = extractDocumentNumber(docente.dni);
        if (cleanDni) {
          updates.dni = cleanDni;
          needsUpdate = true;
        }
      }
      
      // Verificar y limpiar nombres
      const nombresHasExtra = docente.nombres && (
        docente.nombres.includes(';') ||
        docente.nombres.includes('dni:') ||
        docente.nombres.includes('fullName')
      );
      
      // Verificar y limpiar apellidos
      const apellidosHasExtra = docente.apellidos && (
        docente.apellidos.includes(';') ||
        docente.apellidos.includes('dni:') ||
        docente.apellidos.includes('fullName')
      );
      
      if (nombresHasExtra || apellidosHasExtra) {
        // Reconstruir el nombre completo y limpiarlo
        const fullName = `${docente.nombres} ${docente.apellidos}`;
        const { nombres, apellidos } = splitFullName(fullName);
        
        if (nombres && nombres !== docente.nombres) {
          updates.nombres = nombres;
          needsUpdate = true;
        }
        
        if (apellidos && apellidos !== docente.apellidos) {
          updates.apellidos = apellidos;
          needsUpdate = true;
        }
      }
      
      // Actualizar si hay cambios
      if (needsUpdate) {
        await prisma.docenteResolucion.update({
          where: { id: docente.id },
          data: updates
        });
        
        console.log(`✅ Limpiado docente ${docente.id}:`);
        if (updates.dni) console.log(`   DNI: "${docente.dni}" → "${updates.dni}"`);
        if (updates.nombres) console.log(`   Nombres: "${docente.nombres}" → "${updates.nombres}"`);
        if (updates.apellidos) console.log(`   Apellidos: "${docente.apellidos}" → "${updates.apellidos}"`);
        
        cleaned++;
      }
    } catch (error) {
      console.error(`❌ Error limpiando docente ${docente.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Resumen Docentes:`);
  console.log(`   ✅ Limpiados: ${cleaned}`);
  console.log(`   ⏭️  Sin cambios: ${docentes.length - cleaned - errors}`);
  console.log(`   ❌ Errores: ${errors}`);
}

async function cleanEstudiantesData() {
  console.log('\n🧹 LIMPIANDO DATOS DE ESTUDIANTES');
  console.log('===================================\n');
  
  const estudiantes = await prisma.estudianteResolucion.findMany();
  console.log(`📊 Total de estudiantes a revisar: ${estudiantes.length}`);
  
  let cleaned = 0;
  let errors = 0;
  
  for (const estudiante of estudiantes) {
    try {
      let needsUpdate = false;
      const updates = {};
      
      // Verificar y limpiar código
      const codigoHasExtra = estudiante.codigo && (
        estudiante.codigo.includes(';') ||
        estudiante.codigo.includes('fullName') ||
        estudiante.codigo.includes(':')
      );
      
      if (codigoHasExtra) {
        const cleanCode = extractCode(estudiante.codigo);
        if (cleanCode && cleanCode !== estudiante.codigo) {
          updates.codigo = cleanCode;
          needsUpdate = true;
        }
      }
      
      // Verificar y limpiar DNI (muchos estudiantes tienen ":" o están vacíos)
      if (estudiante.dni === ':' || estudiante.dni === '00000000') {
        // Intentar extraer número de documento del código o nombres si existe
        const possibleDoc = extractDocumentNumber(`${estudiante.codigo} ${estudiante.nombres} ${estudiante.apellidos}`);
        if (possibleDoc && possibleDoc !== estudiante.dni) {
          updates.dni = possibleDoc;
          needsUpdate = true;
        } else if (estudiante.dni === ':') {
          updates.dni = ''; // Mejor vacío que ":"
          needsUpdate = true;
        }
      }
      
      // Verificar y limpiar nombres
      const nombresHasExtra = estudiante.nombres && (
        estudiante.nombres.includes(';') ||
        estudiante.nombres.includes('dni:') ||
        estudiante.nombres.includes('fullName')
      );
      
      // Verificar y limpiar apellidos
      const apellidosHasExtra = estudiante.apellidos && (
        estudiante.apellidos.includes(';') ||
        estudiante.apellidos.includes('dni:') ||
        estudiante.apellidos.includes('fullName')
      );
      
      if (nombresHasExtra || apellidosHasExtra) {
        // Reconstruir el nombre completo y limpiarlo
        const fullName = `${estudiante.nombres} ${estudiante.apellidos}`;
        const { nombres, apellidos } = splitFullName(fullName);
        
        if (nombres && nombres !== estudiante.nombres) {
          updates.nombres = nombres;
          needsUpdate = true;
        }
        
        if (apellidos && apellidos !== estudiante.apellidos) {
          updates.apellidos = apellidos;
          needsUpdate = true;
        }
      }
      
      // Actualizar si hay cambios
      if (needsUpdate) {
        await prisma.estudianteResolucion.update({
          where: { id: estudiante.id },
          data: updates
        });
        
        console.log(`✅ Limpiado estudiante ${estudiante.id}:`);
        if (updates.codigo) console.log(`   Código: "${estudiante.codigo}" → "${updates.codigo}"`);
        if (updates.dni !== undefined) console.log(`   DNI: "${estudiante.dni}" → "${updates.dni}"`);
        if (updates.nombres) console.log(`   Nombres: "${estudiante.nombres}" → "${updates.nombres}"`);
        if (updates.apellidos) console.log(`   Apellidos: "${estudiante.apellidos}" → "${updates.apellidos}"`);
        
        cleaned++;
      }
    } catch (error) {
      console.error(`❌ Error limpiando estudiante ${estudiante.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Resumen Estudiantes:`);
  console.log(`   ✅ Limpiados: ${cleaned}`);
  console.log(`   ⏭️  Sin cambios: ${estudiantes.length - cleaned - errors}`);
  console.log(`   ❌ Errores: ${errors}`);
}

async function showSamples() {
  console.log('\n📋 MUESTRAS DE DATOS ACTUALES');
  console.log('================================\n');
  
  // Mostrar algunos docentes problemáticos
  const problematicDocentes = await prisma.docenteResolucion.findMany({
    where: {
      OR: [
        { dni: { contains: ';' } },
        { dni: { contains: 'fullName' } },
        { nombres: { contains: ';' } },
        { apellidos: { contains: 'dni:' } }
      ]
    },
    take: 5
  });
  
  if (problematicDocentes.length > 0) {
    console.log('🔴 Docentes con datos problemáticos:');
    problematicDocentes.forEach(d => {
      console.log(`   ID: ${d.id}`);
      console.log(`   DNI: "${d.dni}"`);
      console.log(`   Nombres: "${d.nombres}"`);
      console.log(`   Apellidos: "${d.apellidos}"\n`);
    });
  }
  
  // Mostrar algunos estudiantes problemáticos
  const problematicEstudiantes = await prisma.estudianteResolucion.findMany({
    where: {
      OR: [
        { codigo: { contains: ';' } },
        { codigo: { contains: 'fullName' } },
        { dni: { equals: ':' } },
        { nombres: { contains: ';' } },
        { apellidos: { contains: 'dni:' } }
      ]
    },
    take: 5
  });
  
  if (problematicEstudiantes.length > 0) {
    console.log('🔴 Estudiantes con datos problemáticos:');
    problematicEstudiantes.forEach(e => {
      console.log(`   ID: ${e.id}`);
      console.log(`   Código: "${e.codigo}"`);
      console.log(`   DNI: "${e.dni}"`);
      console.log(`   Nombres: "${e.nombres}"`);
      console.log(`   Apellidos: "${e.apellidos}"\n`);
    });
  }
}

async function main() {
  console.log('🚀 SCRIPT DE LIMPIEZA DE DATOS DE PARTICIPANTES');
  console.log('================================================\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--preview')) {
    // Solo mostrar muestras sin limpiar
    await showSamples();
  } else if (args.includes('--execute')) {
    // Ejecutar limpieza
    await cleanDocentesData();
    await cleanEstudiantesData();
    
    console.log('\n✅ Limpieza completada');
  } else {
    // Mostrar ayuda
    console.log('USO:');
    console.log('  node scripts/clean-participants-data.js --preview   # Ver datos problemáticos');
    console.log('  node scripts/clean-participants-data.js --execute   # Limpiar los datos');
    console.log('\nSe recomienda hacer --preview primero para ver qué se va a limpiar.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());