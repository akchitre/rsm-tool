import { calcPct, fmtPct } from './dataUtils';

const ec = p => p === null ? '#666' : p >= 60 ? '#2E7D0E' : p >= 30 ? '#8A5000' : '#B02020';
const eb = p => p === null ? '#F5F5F5' : p >= 60 ? '#E8F5DA' : p >= 30 ? '#FFF3E0' : '#FDECEA';

const BASE = 'border:1px solid #CCCCCC;padding:6px 10px;font-size:12px;font-family:Arial,sans-serif;vertical-align:middle;';
const TH   = BASE + 'font-weight:700;background:#EFEFEF;text-align:center;white-space:nowrap;';
const THL  = BASE + 'font-weight:700;background:#EFEFEF;text-align:left;white-space:nowrap;';
const TD   = BASE + 'text-align:center;';
const TDL  = BASE + 'text-align:left;';

export function buildHtmlEmail(region, selProds, rd) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  let h = `<div style="font-family:Arial,sans-serif;font-size:12px;color:#111;">`;
  h += `<p style="margin:0 0 2px;font-size:15px;font-weight:700;">Input Execution Report – ${region}</p>`;
  h += `<p style="margin:0 0 14px;font-size:11px;color:#666;">As on ${today} | Division: NUVENTA | Inputs Only</p>`;

  /* Region Summary */
  h += `<p style="margin:0 0 5px;font-size:12px;font-weight:700;color:#1A4FA0;border-bottom:2px solid #1A4FA0;padding-bottom:2px;">REGION SUMMARY</p>`;
  h += `<table style="border-collapse:collapse;margin-bottom:16px;">`;
  h += `<tr><th style="${THL}width:300px;">Input</th><th style="${TH}">Opening</th><th style="${TH}">Utilised</th><th style="${TH}">Closing</th><th style="${TH}">Exec %</th></tr>`;
  selProds.forEach(p => {
    const d = rd.byProd[p]; const pv = calcPct(d.ut, d.op);
    h += `<tr><td style="${TDL}">${p}</td><td style="${TD}">${d.op}</td><td style="${TD}">${d.ut}</td><td style="${TD}">${d.cl}</td>
      <td style="${TD}font-weight:700;color:${ec(pv)};background:${eb(pv)};">${fmtPct(pv)}</td></tr>`;
  });
  h += `</table>`;

  /* DM-Area Table */
  h += `<p style="margin:0 0 5px;font-size:12px;font-weight:700;color:#1A4FA0;border-bottom:2px solid #1A4FA0;padding-bottom:2px;">DM-AREA WISE EXECUTION</p>`;
  h += `<table style="border-collapse:collapse;width:100%;margin-bottom:16px;">`;
  h += `<tr>
    <th style="${THL}">Region</th>
    <th style="${THL}">DM HQ</th>
    <th style="${THL}">DM Name</th>
    <th style="${TH}">SOs</th>
    <th style="${TH}">Opening</th>
    <th style="${TH}">Utilised</th>
    <th style="${TH}">Closing</th>
    <th style="${TH}">Exec %</th>
  </tr>`;

  /* Region total row */
  const rp = calcPct(rd.totUt, rd.totOp);
  h += `<tr style="background:#E8F0FD;font-weight:700;">
    <td style="${TDL}font-weight:700;" colspan="3">${region} — Total</td>
    <td style="${TD}font-weight:700;">${rd.numSOs}</td>
    <td style="${TD}font-weight:700;">${rd.totOp}</td>
    <td style="${TD}font-weight:700;">${rd.totUt}</td>
    <td style="${TD}font-weight:700;">${rd.totOp - rd.totUt}</td>
    <td style="${TD}font-weight:700;color:${ec(rp)};background:${eb(rp)};">${fmtPct(rp)}</td>
  </tr>`;

  rd.dms.forEach(dm => {
    const dp = calcPct(dm.totUt, dm.totOp);
    h += `<tr style="background:#F8F8F8;">
      <td style="${TDL}color:#999;"></td>
      <td style="${TDL}font-weight:700;">${dm.dmHQ}</td>
      <td style="${TDL}">${dm.dmName || '—'}</td>
      <td style="${TD}">${dm.numSOs}</td>
      <td style="${TD}">${dm.totOp}</td>
      <td style="${TD}">${dm.totUt}</td>
      <td style="${TD}">${dm.totOp - dm.totUt}</td>
      <td style="${TD}font-weight:700;color:${ec(dp)};background:${eb(dp)};">${fmtPct(dp)}</td>
    </tr>`;
    dm.sos.forEach(so => {
      const sp = calcPct(so.totUt, so.totOp);
      h += `<tr>
        <td style="${TDL}"></td>
        <td style="${TDL}color:#888;font-size:11px;padding-left:18px;">└ SO</td>
        <td style="${TDL}font-size:11px;">${so.name}</td>
        <td style="${TD}font-size:11px;">—</td>
        <td style="${TD}font-size:11px;">${so.totOp}</td>
        <td style="${TD}font-size:11px;">${so.totUt}</td>
        <td style="${TD}font-size:11px;">${so.totOp - so.totUt}</td>
        <td style="${TD}font-size:11px;font-weight:700;color:${ec(sp)};background:${eb(sp)};">${fmtPct(sp)}</td>
      </tr>`;
    });
  });
  h += `</table>`;

  /* Key Findings */
  h += `<p style="margin:0 0 5px;font-size:12px;font-weight:700;color:#1A4FA0;border-bottom:2px solid #1A4FA0;padding-bottom:2px;">KEY FINDINGS</p>`;
  h += `<ul style="margin:0 0 12px;padding-left:18px;font-size:12px;line-height:1.8;">`;

  selProds.forEach(p => {
    const d = rd.byProd[p]; const pv = calcPct(d.ut, d.op);
    const st = pv === null ? 'N/A' : pv >= 60 ? 'STRONG ✅' : pv >= 30 ? 'MODERATE ⚠️' : 'LOW — ACTION NEEDED 🚫';
    h += `<li><b>${p}</b>: ${fmtPct(pv)} — ${st}</li>`;
  });

  const zeroDMs = rd.dms.filter(d => d.totOp > 0 && d.totUt === 0);
  if (zeroDMs.length)
    h += `<li style="color:#B02020;"><b>DM areas at 0%:</b> ${zeroDMs.map(d => d.dmHQ).join(', ')}</li>`;

  const zSOs = rd.dms.flatMap(dm =>
    dm.sos.filter(s => s.totOp > 0 && s.totUt === 0).map(s => `${s.name} [${dm.dmHQ}]`)
  );
  if (zSOs.length)
    h += `<li style="color:#B02020;"><b>SOs with 0% execution:</b> ${zSOs.slice(0, 10).join(', ')}${zSOs.length > 10 ? ` +${zSOs.length - 10} more` : ''}</li>`;

  const top = [...rd.dms].sort((a, b) => (calcPct(b.totUt, b.totOp) || 0) - (calcPct(a.totUt, a.totOp) || 0))[0];
  if (top)
    h += `<li><b>Best DM area:</b> ${top.dmHQ} (${top.dmName || '—'}) — ${fmtPct(calcPct(top.totUt, top.totOp))}</li>`;

  h += `</ul>`;
  h += `<p style="font-size:12px;">Kindly ensure corrective action on lagging territories before month-end.</p>`;
  h += `<p style="font-size:12px;margin-top:10px;">Regards,;
  h += `</div>`;
  return h;
}
