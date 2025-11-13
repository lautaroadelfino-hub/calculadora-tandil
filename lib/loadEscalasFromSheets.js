// lib/loadEscalasFromSheets.js

// ⬇️ REEMPLAZÁ SOLO ESTOS DOS BLOQUES CON TU DOC Y GIDs CORRECTOS
const SHEET_ID =
  "2PACX-1vQQYdjr9D_QIKi5Jtpo7MEkndYO9pNd0KqaFdLJkJ8UM5leafD7HMZjtg3G2K6-lZVaDts1JGhBPdNI"; // tu pub ID

const GIDS = {
  administracion: 298985926,  // "Adm. Central"
  sisp:          62974123,    // "SISP"
  obras:         767129474,   // "Obras Sanitarias"
  comercio:      0,           // "Comercio"
  fehgra:        1034588714,  // "Hoteles / Gastronomía (FEHGRA)" ⬅️ PONÉ ACÁ EL GID REAL
};
// ⬆️ HASTA ACÁ

const urlCSV = (gid) =>
  `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${gid}&single=true&output=csv`;

async function fetchCsvRows(gid) {
  const res = await fetch(urlCSV(gid));
  if (!res.ok) throw new Error(`HTTP ${res.status} al leer gid=${gid}`);
  const text = await res.text();

  // normalizamos CRLF y respetamos campos entre comillas
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);

  const parseLine = (line) => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  return lines.map(parseLine);
}

function normalizeHeader(h) {
  const s = (h || "").toString().trim().toLowerCase();
  return s
    .replace("básico", "basico")
    .replace("no remunerativa", "no_rem_fijo")
    .replace("no remunerativo", "no_rem_fijo")
    .replace("presentismo fijo", "presentismo_fijo")
    .replace(/\s+/g, "_");
}

function parseEscala(csv) {
  if (!csv || !csv.length) return {};
  const header = csv[0].map(normalizeHeader);

  const idx = {
    mes: header.indexOf("mes"),
    cat: header.indexOf("categoria"),
    bas: header.indexOf("basico"),
    nrem: header.indexOf("no_rem_fijo"),
    pres: header.indexOf("presentismo_fijo"),
  };

  const out = {};
  for (let i = 1; i < csv.length; i++) {
    const r = csv[i];
    const mes = (r[idx.mes] || "").trim();
    const categoria = (r[idx.cat] || "").trim();
    if (!mes || !categoria) continue;

    const basico = Number(r[idx.bas] || 0) || 0;
    const noRem  = Number(r[idx.nrem] || 0) || 0;
    const presentismo = Number(r[idx.pres] || 0) || 0;

    if (!out[mes]) out[mes] = { categoria: {} };
    out[mes].categoria[categoria] = { basico, noRem, presentismo };
  }
  return out;
}

export async function loadEscalasFromSheets() {
  const [adm, sisp, obr, com, feh] = await Promise.all([
    fetchCsvRows(GIDS.administracion).then(parseEscala),
    fetchCsvRows(GIDS.sisp).then(parseEscala),
    fetchCsvRows(GIDS.obras).then(parseEscala),
    fetchCsvRows(GIDS.comercio).then(parseEscala),
    fetchCsvRows(GIDS.fehgra).then(parseEscala),
  ]);

  // Mantengo EXACTO lo que ya esperaba tu app (.publico.*, .privado.comercio)
  // y le agrego .privado.fehgra para el nuevo convenio.
  return {
    publico: {
      administracion: adm,
      sisp: sisp,
      obras: obr,
    },
    privado: {
      comercio: com,
      fehgra: feh,
    },
  };
}
