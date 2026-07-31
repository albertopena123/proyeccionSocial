/**
 * Convierte los pósters de la portada (PNG de ~2.5MB cada uno) a WebP al tamaño
 * real de la tarjeta, y los renombra al slug que usa el código.
 *
 * Todos los originales son 1072x1467 (proporción 0.731). Las tarjetas de
 * elencos tienen exactamente esa proporción, así que ahí el reescalado es
 * limpio y sin recorte; las láminas de responsabilidad también la respetan.
 *
 * Los tamaños de salida son 2x la tarjeta: el techo útil, porque el original no
 * da para 3x. No tiene sentido guardar más.
 *
 * Se ejecuta a mano cuando llegan pósters nuevos: node scripts/convert-elencos.js
 */
const sharp = require("sharp")
const fs = require("fs")
const path = require("path")

// Cada grupo: de dónde salen los originales, a dónde van los WebP, a qué tamaño
// y qué archivo corresponde a qué slug. Los originales llegan con espacios,
// tildes y mayúsculas; en la URL eso obliga a codificar, así que aquí se
// normaliza al slug que ya usan ELENCOS y PILARES.
const GRUPOS = [
  {
    nombre: "elencos",
    origenes: "assets/elencos-originales",
    destino: "public/images/elencos",
    ancho: 760, // 2x la tarjeta de escritorio (380x520)
    alto: 1040,
    mapa: {
      "Canto y música armonía vocal.png": "canto",
      "Taller de teatro y oratoria.png": "teatro",
      "folkloricas_peruanas.png": "danzas",
      "Baile contemporáneo expresión y movimiento.png": "baile",
      "Arte y creatividad en acción.png": "plasticas",
      "Tuna universitaria de la UNAMAD.png": "tuna",
    },
  },
  {
    nombre: "responsabilidad",
    origenes: "assets/responsabilidad-originales",
    destino: "public/images/responsabilidad",
    ancho: 768, // 2x la lámina (max-w-sm = 384px)
    alto: 1050,
    mapa: {
      "Compromiso social y acción comunitaria.png": "compromiso",
      "Voluntariado para un futuro mejor.png": "voluntariado",
      "Impacto y comunidad en acción.png": "impacto",
    },
  },
]

// 88 y no el 80 habitual: los pósters llevan el título y la bajada quemados en
// la imagen, y el texto es lo primero que se ensucia al comprimir.
const CALIDAD = 88

async function main() {
  for (const grupo of GRUPOS) {
    console.log(`\n${grupo.nombre}`)
    fs.mkdirSync(grupo.destino, { recursive: true })

    for (const [origen, slug] of Object.entries(grupo.mapa)) {
      const entrada = path.join(grupo.origenes, origen)
      if (!fs.existsSync(entrada)) {
        console.warn(`  falta ${origen} - se omite`)
        continue
      }

      const salida = path.join(grupo.destino, `${slug}.webp`)
      await sharp(entrada)
        .resize(grupo.ancho, grupo.alto, { fit: "cover" })
        .webp({ quality: CALIDAD })
        .toFile(salida)

      const antes = fs.statSync(entrada).size / 1024
      const despues = fs.statSync(salida).size / 1024
      console.log(
        `  ${slug.padEnd(13)} ${Math.round(antes)} KB -> ${Math.round(despues)} KB` +
          `  (-${Math.round((1 - despues / antes) * 100)}%)`
      )
    }
  }
}

main()
