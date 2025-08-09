// scripts/fix-extreme-participant-cases.js
// Script específico para corregir casos extremos donde el parseo falló completamente

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función para reconstruir datos desde el texto crudo
function reconstructFromRawText(codigo, nombres, apellidos) {
  // Intentar reconstruir el nombre completo desde el campo código si contiene fullName
  let fullName = '';
  let cleanCode = '';
  let documentNumber = '';
  
  // Si el código contiene fullName, extraer de ahí
  if (codigo && codigo.includes('fullName:')) {
    const match = codigo.match(/fullName:([^;]+)/i);
    if (match) {
      fullName = match[1].trim();
    }
  }
  
  // Si no encontramos en código, usar nombres y apellidos
  if (!fullName) {
    // Limpiar apellidos de basura
    let cleanApellidos = apellidos;
    if (cleanApellidos) {
      cleanApellidos = cleanApellidos.split(';')[0].split(':')[0].trim();
    }
    
    // Combinar nombres y apellidos limpios
    fullName = `${nombres || ''} ${cleanApellidos || ''}`.trim();
  }
  
  // Buscar código de estudiante en cualquier parte
  const allText = `${codigo} ${nombres} ${apellidos}`;
  const codeMatch = allText.match(/\b\d{8,10}\b/);
  if (codeMatch) {
    cleanCode = codeMatch[0];
  }
  
  // Buscar DNI en cualquier parte  
  const dniMatch = allText.match(/dni:\s*(\d{8})/i);
  if (dniMatch) {
    documentNumber = dniMatch[1];
  } else {
    // Buscar cualquier número de 8 dígitos
    const docMatch = allText.match(/\b\d{8}\b/);
    if (docMatch && docMatch[0] !== cleanCode) {
      documentNumber = docMatch[0];
    }
  }
  
  // Separar nombre completo en nombres y apellidos
  const parts = fullName.split(/\s+/).filter(p => p);
  let finalNombres = '';
  let finalApellidos = '';
  
  if (parts.length === 0) {
    finalNombres = nombres || 'Sin nombre';
    finalApellidos = apellidos ? apellidos.split(';')[0].trim() : 'Sin apellido';
  } else if (parts.length === 1) {
    finalNombres = parts[0];
    finalApellidos = '';
  } else if (parts.length === 2) {
    finalNombres = parts[0];
    finalApellidos = parts[1];
  } else if (parts.length === 3) {
    finalNombres = parts[0];
    finalApellidos = `${parts[1]} ${parts[2]}`;
  } else {
    // Dividir por la mitad
    const mid = Math.floor(parts.length / 2);
    finalNombres = parts.slice(0, mid).join(' ');
    finalApellidos = parts.slice(mid).join(' ');
  }
  
  return {
    codigo: cleanCode || `TEMP-${Date.now()}`,
    dni: documentNumber,
    nombres: finalNombres,
    apellidos: finalApellidos
  };
}

async function fixExtremeDocentes() {
  console.log('🔧 CORRIGIENDO CASOS EXTREMOS DE DOCENTES');
  console.log('==========================================\n');
  
  // Buscar docentes con datos muy mal formateados
  const problematicDocentes = await prisma.docenteResolucion.findMany({
    where: {
      OR: [
        { dni: { contains: ';' } },
        { dni: { contains: 'fullName' } },
        { nombres: { contains: ';' } },
        { apellidos: { contains: ';' } },
        { apellidos: { contains: 'dni:' } },
        { apellidos: { contains: 'fullName' } }
      ]
    }
  });
  
  console.log(`📊 Docentes con problemas extremos: ${problematicDocentes.length}\n`);
  
  let fixed = 0;
  for (const docente of problematicDocentes) {
    try {
      // Reconstruir desde el texto crudo
      const reconstructed = reconstructFromRawText(
        docente.dni,  // A veces el DNI tiene todo el texto
        docente.nombres,
        docente.apellidos
      );
      
      // Actualizar con datos limpios
      await prisma.docenteResolucion.update({
        where: { id: docente.id },
        data: {
          dni: reconstructed.dni || docente.dni.replace(/[^0-9]/g, '').substring(0, 8) || '00000000',
          nombres: reconstructed.nombres,
          apellidos: reconstructed.apellidos
        }
      });
      
      console.log(`✅ Corregido docente ${docente.id}:`);
      console.log(`   ANTES: dni="${docente.dni}", nombres="${docente.nombres}", apellidos="${docente.apellidos}"`);
      console.log(`   AHORA: dni="${reconstructed.dni}", nombres="${reconstructed.nombres}", apellidos="${reconstructed.apellidos}"\n`);
      
      fixed++;
    } catch (error) {
      console.error(`❌ Error con docente ${docente.id}: ${error.message}`);
    }
  }
  
  console.log(`📊 Total corregidos: ${fixed}/${problematicDocentes.length}\n`);
}

async function fixExtremeEstudiantes() {
  console.log('🔧 CORRIGIENDO CASOS EXTREMOS DE ESTUDIANTES');
  console.log('=============================================\n');
  
  // Buscar estudiantes con datos muy mal formateados
  const problematicEstudiantes = await prisma.estudianteResolucion.findMany({
    where: {
      OR: [
        { dni: { equals: ':' } },
        { codigo: { startsWith: ';' } },
        { codigo: { contains: 'fullName' } },
        { nombres: { contains: ';' } },
        { apellidos: { contains: ';' } },
        { apellidos: { contains: 'dni:' } },
        { apellidos: { contains: 'fullName' } }
      ]
    }
  });
  
  console.log(`📊 Estudiantes con problemas extremos: ${problematicEstudiantes.length}\n`);
  
  let fixed = 0;
  for (const estudiante of problematicEstudiantes) {
    try {
      // Reconstruir desde el texto crudo
      const reconstructed = reconstructFromRawText(
        estudiante.codigo,
        estudiante.nombres,
        estudiante.apellidos
      );
      
      // Actualizar con datos limpios
      await prisma.estudianteResolucion.update({
        where: { id: estudiante.id },
        data: {
          codigo: reconstructed.codigo,
          dni: reconstructed.dni || '',
          nombres: reconstructed.nombres,
          apellidos: reconstructed.apellidos
        }
      });
      
      console.log(`✅ Corregido estudiante ${estudiante.id}:`);
      console.log(`   ANTES: codigo="${estudiante.codigo}", dni="${estudiante.dni}", nombres="${estudiante.nombres}", apellidos="${estudiante.apellidos}"`);
      console.log(`   AHORA: codigo="${reconstructed.codigo}", dni="${reconstructed.dni}", nombres="${reconstructed.nombres}", apellidos="${reconstructed.apellidos}"\n`);
      
      fixed++;
    } catch (error) {
      console.error(`❌ Error con estudiante ${estudiante.id}: ${error.message}`);
    }
  }
  
  console.log(`📊 Total corregidos: ${fixed}/${problematicEstudiantes.length}\n`);
}

async function showStatistics() {
  console.log('📊 ESTADÍSTICAS FINALES');
  console.log('=======================\n');
  
  // Contar problemas restantes
  const docentesWithProblems = await prisma.docenteResolucion.count({
    where: {
      OR: [
        { dni: { contains: ';' } },
        { dni: { contains: ':' } },
        { nombres: { contains: ';' } },
        { apellidos: { contains: ';' } }
      ]
    }
  });
  
  const estudiantesWithProblems = await prisma.estudianteResolucion.count({
    where: {
      OR: [
        { dni: { equals: ':' } },
        { codigo: { contains: ';' } },
        { codigo: { contains: ':' } },
        { nombres: { contains: ';' } },
        { apellidos: { contains: ';' } }
      ]
    }
  });
  
  const totalDocentes = await prisma.docenteResolucion.count();
  const totalEstudiantes = await prisma.estudianteResolucion.count();
  
  console.log('Docentes:');
  console.log(`  Total: ${totalDocentes}`);
  console.log(`  Con problemas restantes: ${docentesWithProblems}`);
  console.log(`  Limpios: ${totalDocentes - docentesWithProblems} (${((totalDocentes - docentesWithProblems) / totalDocentes * 100).toFixed(1)}%)\n`);
  
  console.log('Estudiantes:');
  console.log(`  Total: ${totalEstudiantes}`);
  console.log(`  Con problemas restantes: ${estudiantesWithProblems}`);
  console.log(`  Limpios: ${totalEstudiantes - estudiantesWithProblems} (${((totalEstudiantes - estudiantesWithProblems) / totalEstudiantes * 100).toFixed(1)}%)\n`);
}

async function main() {
  console.log('🚀 CORRECCIÓN DE CASOS EXTREMOS');
  console.log('================================\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--preview')) {
    // Mostrar algunos ejemplos
    const examples = await prisma.estudianteResolucion.findMany({
      where: {
        OR: [
          { dni: { equals: ':' } },
          { codigo: { startsWith: ';' } }
        ]
      },
      take: 5
    });
    
    console.log('Ejemplos de casos extremos:');
    examples.forEach(e => {
      console.log(`\nID: ${e.id}`);
      console.log(`  Código: "${e.codigo}"`);
      console.log(`  DNI: "${e.dni}"`);
      console.log(`  Nombres: "${e.nombres}"`);
      console.log(`  Apellidos: "${e.apellidos}"`);
      
      const reconstructed = reconstructFromRawText(e.codigo, e.nombres, e.apellidos);
      console.log('  → Se corregiría a:');
      console.log(`    Código: "${reconstructed.codigo}"`);
      console.log(`    DNI: "${reconstructed.dni}"`);
      console.log(`    Nombres: "${reconstructed.nombres}"`);
      console.log(`    Apellidos: "${reconstructed.apellidos}"`);
    });
  } else if (args.includes('--execute')) {
    await fixExtremeDocentes();
    await fixExtremeEstudiantes();
    await showStatistics();
  } else {
    console.log('USO:');
    console.log('  node scripts/fix-extreme-participant-cases.js --preview   # Ver ejemplos');
    console.log('  node scripts/fix-extreme-participant-cases.js --execute   # Ejecutar corrección');
  }
}

main()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());