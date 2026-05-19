/**
 * parseCSV — handles quoted fields, BOM, latin-1 encoding artifacts
 * Returns array of objects keyed by header row
 */
export function parseCSV(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  function splitLine(line) {
    const res = []; let cur = ''; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { res.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    res.push(cur.trim());
    return res;
  }

  const cols = splitLine(lines[0]).map(c => c.replace(/"/g, '').trim());
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    const obj = {};
    cols.forEach((c, i) => { obj[c] = (vals[i] || '').replace(/"/g, '').trim(); });
    return obj;
  }).filter(r => Object.values(r).some(Boolean));
}

/**
 * processData — builds nested tree from CSV rows
 *
 * Columns used (exact match, Col G = RSM_AREA for region dropdown):
 *   RSM_AREA       → region dropdown  (Col G)
 *   DM_AREA        → DM HQ            (Col J)
 *   DM_NAME        → DM Name          (Col K)
 *   EMP_NO         → SO employee no   (Col R)
 *   EMP_NAME       → SO name          (Col S)
 *   SGPI_TYPE      → filter "Input"   (Col X)
 *   SGPI_PRODUCTNAME → product name   (Col Z)
 *   OPENINGQTY / UTILISEDQTY / CLOSINGQTY
 *
 * Returns: { tree, products, regions }
 */
export function processData(rows) {
  if (!rows.length) return null;

  const keys = Object.keys(rows[0]);

  // Exact column name match (case-insensitive, ignores leading BOM chars)
  const col = (name) => keys.find(k => k.trim().replace(/^\W+/, '').toUpperCase() === name.toUpperCase()) || '';

  const C = {
    type    : col('SGPI_TYPE'),
    region  : col('RSM_AREA'),       // Col G — region dropdown
    dmHQ    : col('DM_AREA'),        // Col J
    dmName  : col('DM_NAME'),        // Col K
    empNo   : col('EMP_NO'),         // Col R
    empName : col('EMP_NAME'),       // Col S
    prod    : col('SGPI_PRODUCTNAME'),
    op      : col('OPENINGQTY'),
    ut      : col('UTILISEDQTY'),
    cl      : col('CLOSINGQTY'),
  };

  // Warn in console if any column not found
  Object.entries(C).forEach(([k, v]) => { if (!v) console.warn(`Column not found: ${k}`); });

  const inputs = rows.filter(r => (r[C.type] || '').toLowerCase() === 'input');
  if (!inputs.length) return null;

  const tree = {};
  const prodSet = new Set();

  inputs.forEach(r => {
    const region  = r[C.region]  || '';
    const dmHQ    = r[C.dmHQ]    || '';
    const dmName  = r[C.dmName]  || '';
    const empNo   = r[C.empNo]   || '';
    const empName = r[C.empName] || '';
    const prod    = r[C.prod]    || '';
    const op = parseFloat(r[C.op]) || 0;
    const ut = parseFloat(r[C.ut]) || 0;
    const cl = parseFloat(r[C.cl]) || 0;

    if (!region || !prod || !empNo || empNo === '0') return;
    prodSet.add(prod);

    if (!tree[region]) tree[region] = {};
    if (!tree[region][dmHQ]) tree[region][dmHQ] = { dm_name: dmName, sos: {} };

    const sk = empNo + '|' + empName;
    if (!tree[region][dmHQ].sos[sk]) tree[region][dmHQ].sos[sk] = { name: empName };
    if (!tree[region][dmHQ].sos[sk][prod]) tree[region][dmHQ].sos[sk][prod] = { op: 0, ut: 0, cl: 0 };
    tree[region][dmHQ].sos[sk][prod].op += op;
    tree[region][dmHQ].sos[sk][prod].ut += ut;
    tree[region][dmHQ].sos[sk][prod].cl += cl;
  });

  return {
    tree,
    products: [...prodSet].filter(Boolean).sort(),
    regions : Object.keys(tree).sort(),
  };
}

/**
 * computeSummary — rolls up tree for a given region + product list
 */
export function computeSummary(tree, region, selProds) {
  const regionData = tree[region] || {};

  const dms = Object.entries(regionData).map(([dmHQ, dmInfo]) => {
    const sos = Object.values(dmInfo.sos).map(soData => {
      const byProd = {};
      selProds.forEach(p => { byProd[p] = soData[p] ? { ...soData[p] } : { op: 0, ut: 0, cl: 0 }; });
      const totOp = selProds.reduce((a, p) => a + byProd[p].op, 0);
      const totUt = selProds.reduce((a, p) => a + byProd[p].ut, 0);
      return { name: soData.name, byProd, totOp, totUt };
    }).filter(s => s.totOp > 0 || s.totUt > 0);

    const dmByProd = {};
    selProds.forEach(p => {
      dmByProd[p] = {
        op: sos.reduce((a, s) => a + s.byProd[p].op, 0),
        ut: sos.reduce((a, s) => a + s.byProd[p].ut, 0),
        cl: sos.reduce((a, s) => a + s.byProd[p].cl, 0),
      };
    });
    return {
      dmHQ, dmName: dmInfo.dm_name, sos, byProd: dmByProd,
      totOp: sos.reduce((a, s) => a + s.totOp, 0),
      totUt: sos.reduce((a, s) => a + s.totUt, 0),
      numSOs: sos.length,
    };
  }).filter(d => d.totOp > 0 || d.totUt > 0);

  const regByProd = {};
  selProds.forEach(p => {
    regByProd[p] = {
      op: dms.reduce((a, d) => a + d.byProd[p].op, 0),
      ut: dms.reduce((a, d) => a + d.byProd[p].ut, 0),
      cl: dms.reduce((a, d) => a + d.byProd[p].cl, 0),
    };
  });

  return {
    dms, byProd: regByProd,
    totOp: dms.reduce((a, d) => a + d.totOp, 0),
    totUt: dms.reduce((a, d) => a + d.totUt, 0),
    numSOs: dms.reduce((a, d) => a + d.numSOs, 0),
  };
}

// ── Colour helpers ──────────────────────────────────────────
export const calcPct = (ut, op) => op > 0 ? (ut / op) * 100 : null;
export const fmtPct  = p => p === null ? '—' : p.toFixed(1) + '%';
export const clrFn   = p => p === null ? '#999' : p >= 60 ? '#2E7D0E' : p >= 30 ? '#8A5000' : '#B02020';
export const bgFn    = p => p === null ? '#F5F5F5' : p >= 60 ? '#E8F5DA' : p >= 30 ? '#FFF3E0' : '#FDECEA';
export const dotFn   = p => p === null ? '⚪' : p >= 60 ? '🟢' : p >= 30 ? '🟡' : '🔴';
