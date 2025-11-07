export async function loadEscalasFromSheets() {
  const SHEET_BASE =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQYdjr9D_QIKi5Jtpo7MEkndYO9pNd0KqaFdLJkJ8UM5leafD7HMZjtg3G2K6-lZVaDts1JGhBPdNI/pub?gid=";

  const SHEETS = {
    administracion: SHEET_BASE + "298985926&single=true&output=csv",
    sisp: SHEET_BASE + "62974123&single=true&output=csv",
    obras: SHEET_BASE + "767129474&single=true&output=csv",
    comercio: SHEET_BASE + "0&single=true&output=csv",
  };

  async function fetchCSV(url) {
    const res = await fetch(url);
    const text = await res.text();
    return text.split("\n").map((l) => l.split(",").map((x) => x.trim()));
  }

  function parseEscala(csv) {
    const [header, ...rows] = csv;

    const idx = {
      mes: header.indexOf("mes"),
      cat: header.indexOf("categoria"),
      bas: header.indexOf("basico"),
      nrem: header.indexOf("no_rem_fijo"),
      pres: header.indexOf("presentismo_fijo"),
    };

    const out = {};

    for (const r of rows) {
      const mes = r[idx.mes];
      const cat = r[idx.cat];
      if (!mes || !cat) continue;

      if (!out[mes]) out[mes] = { categoria: {} };
      out[mes].categoria[cat] = {
        basico: Number(r[idx.bas]) || 0,
        noRem: Number(r[idx.nrem]) || 0,
        presentismo: Number(r[idx.pres]) || 0,
      };
    }
    return out;
  }

  const results = await Promise.all([
    fetchCSV(SHEETS.administracion),
    fetchCSV(SHEETS.sisp),
    fetchCSV(SHEETS.obras),
    fetchCSV(SHEETS.comercio),
  ]);

  const administracion = parseEscala(results[0]);
  const sisp = parseEscala(results[1]);
  const obras = parseEscala(results[2]);
  const comercio = parseEscala(results[3]);

  return {
    publico: {
      administracion,
      sisp,
      obras,
    },
    privado: {
      comercio,
    },
  };
}
