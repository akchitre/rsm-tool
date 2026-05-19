import { useState, useMemo, useRef, useCallback } from 'react';
import Head from 'next/head';
import { parseCSV, processData, computeSummary, calcPct, fmtPct, clrFn, bgFn, dotFn } from '../components/dataUtils';
import { buildHtmlEmail } from '../components/emailBuilder';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [data, setData]           = useState(null);
  const [loadErr, setLoadErr]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [selRegion, setSelRegion] = useState('');
  const [selProd, setSelProd]     = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [copyMsg, setCopyMsg]     = useState('');
  const fileRef  = useRef();
  const emailRef = useRef();

  /* ── File upload ── */
  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setLoadErr(''); setData(null);
    setSelRegion(''); setSelProd(''); setShowEmail(false); setCopyMsg('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result);
        const d = processData(rows);
        if (!d || !d.regions.length) throw new Error('No Input rows found. Check SGPI_TYPE column.');
        setData(d);
        setSelRegion(d.regions[0]);
      } catch (err) { setLoadErr(err.message); }
      setLoading(false);
    };
    reader.onerror = () => { setLoadErr('Could not read file.'); setLoading(false); };
    reader.readAsText(file, 'latin1');
    e.target.value = '';
  }, []);

  /* ── Summary computation ── */
  const selProds = useMemo(() => selProd ? [selProd] : [], [selProd]);
  const rd = useMemo(() => {
    if (!data || !selRegion || !selProds.length) return null;
    return computeSummary(data.tree, selRegion, selProds);
  }, [data, selRegion, selProds]);

  const emailHtml = useMemo(() => {
    if (!rd || !selProds.length) return '';
    return buildHtmlEmail(selRegion, selProds, rd);
  }, [rd, selRegion, selProds]);

  /* ── Copy email — select content, user presses Ctrl+C ── */
  const selectAll = useCallback(() => {
    if (!emailRef.current) return;
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(emailRef.current);
    sel.removeAllRanges();
    sel.addRange(range);
    // Also try modern API
    try {
      const blob = new Blob([emailRef.current.innerHTML], { type: 'text/html' });
      navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]).then(() => {
        setCopyMsg('Copied! Paste directly into Outlook / Gmail.');
        setTimeout(() => setCopyMsg(''), 4000);
      }).catch(() => {
        setCopyMsg('Content selected — press Ctrl+C to copy.');
        setTimeout(() => setCopyMsg(''), 5000);
      });
    } catch {
      setCopyMsg('Content selected — press Ctrl+C to copy.');
      setTimeout(() => setCopyMsg(''), 5000);
    }
  }, []);

  /* ── UI helpers ── */
  const Pill = ({ ut, op }) => {
    const pv = calcPct(ut, op);
    return (
      <span style={{ background: bgFn(pv), color: clrFn(pv), padding: '2px 9px', borderRadius: 12,
        fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>
        {dotFn(pv)} {fmtPct(pv)}
      </span>
    );
  };

  const Bar = ({ ut, op }) => {
    const pv = calcPct(ut, op);
    return (
      <div style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 4, width: 60,
        height: 5, background: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pv ?? 0, 100)}%`, height: 5, background: clrFn(pv), borderRadius: 3 }} />
      </div>
    );
  };

  const Step = ({ n, label, done }) => (
    <div className={styles.step}>
      <div className={styles.stepBadge} style={{ background: done ? 'var(--green)' : 'var(--border)', color: done ? '#fff' : 'var(--text2)' }}>
        {done ? '✓' : n}
      </div>
      <span style={{ color: done ? 'var(--text)' : 'var(--text2)', fontWeight: done ? 500 : 400 }}>{label}</span>
    </div>
  );

  return (
    <>
      <Head>
        <title>RSM Execution Report Tool</title>
        <meta name="description" content="NUVENTA Division — Input execution report generator for RSMs" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>RSM Execution Report Tool</h1>
          <p className={styles.subtitle}>NUVENTA Division · Upload CSV → Select Input → Pick Region → Copy Email</p>
        </div>

        {/* Steps indicator */}
        <div className={styles.steps}>
          <Step n={1} label="Upload CSV" done={!!data} />
          <Step n={2} label="Select input" done={!!selProd} />
          <Step n={3} label="Select region" done={!!rd} />
          <Step n={4} label="Copy email" done={copyMsg.startsWith('Copied')} />
        </div>

        {/* ① Upload */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>① Upload execution data CSV</p>
          <div className={styles.row}>
            <button className={styles.btn} onClick={() => fileRef.current.click()}>
              📂 Choose CSV file
            </button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
            {loading && <span className={styles.info}>⏳ Reading…</span>}
            {data && (
              <span className={styles.success}>
                ✓ Loaded — {data.regions.length} regions · {data.products.length} input types
              </span>
            )}
            {loadErr && <span className={styles.error}>⚠ {loadErr}</span>}
          </div>
        </div>

        {data && (
          <>
            {/* ② Input dropdown */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>② Select input to analyse</p>
              <select
                value={selProd}
                onChange={e => { setSelProd(e.target.value); setShowEmail(false); setCopyMsg(''); }}
                className={styles.select}
              >
                <option value="">— Select an input —</option>
                {data.products.filter(Boolean).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {selProd && <p className={styles.successSm}>✓ Selected: {selProd}</p>}
            </div>

            {/* ③ Region dropdown — uses RSM_AREA (Col G) */}
            {selProd && (
              <div className={styles.card}>
                <p className={styles.cardTitle}>③ Select region <span className={styles.colNote}>(RSM Area)</span></p>
                <select
                  value={selRegion}
                  onChange={e => { setSelRegion(e.target.value); setShowEmail(false); setCopyMsg(''); }}
                  className={styles.select}
                >
                  {data.regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ④ Execution table */}
            {rd && (
              <>
                {/* Summary cards */}
                <div className={styles.cards}>
                  {selProds.map(p => {
                    const d = rd.byProd[p]; const pv = calcPct(d.ut, d.op);
                    return (
                      <div key={p} className={styles.summaryCard} style={{ borderLeft: `4px solid ${clrFn(pv)}` }}>
                        <p className={styles.summaryLabel}>{p}</p>
                        <p className={styles.summaryPct} style={{ color: clrFn(pv) }}>{fmtPct(pv)}</p>
                        <p className={styles.summarySub}>{d.ut} used / {d.op} alloc · {d.cl} remaining</p>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className={styles.legend}>
                  <span style={{ color: 'var(--green)' }}>🟢 Strong ≥60%</span>
                  <span style={{ color: 'var(--amber)' }}>🟡 Moderate 30–59%</span>
                  <span style={{ color: 'var(--red)' }}>🔴 Low &lt;30%</span>
                </div>

                {/* Main table */}
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Region</th>
                        <th style={{ textAlign: 'left' }}>DM HQ</th>
                        <th style={{ textAlign: 'left' }}>DM Name</th>
                        <th>SOs</th>
                        <th>Opening</th>
                        <th>Utilised</th>
                        <th>Closing</th>
                        <th>Exec %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Region total */}
                      <tr style={{ background: '#EBF3FF', fontWeight: 700 }}>
                        <td colSpan={3} style={{ fontWeight: 700 }}>{selRegion} — Total</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{rd.numSOs}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{rd.totOp}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{rd.totUt}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{rd.totOp - rd.totUt}</td>
                        <td style={{ textAlign: 'center' }}>
                          <Pill ut={rd.totUt} op={rd.totOp} />
                          <Bar ut={rd.totUt} op={rd.totOp} />
                        </td>
                      </tr>

                      {rd.dms.map((dm, di) => (
                        <>
                          <tr key={`dm${di}`} style={{ background: 'var(--bg2)' }}>
                            <td style={{ color: 'var(--text2)', fontSize: 11 }}></td>
                            <td style={{ fontWeight: 600 }}>{dm.dmHQ}</td>
                            <td style={{ fontSize: 11, color: 'var(--text2)' }}>{dm.dmName || '—'}</td>
                            <td style={{ textAlign: 'center' }}>{dm.numSOs}</td>
                            <td style={{ textAlign: 'center' }}>{dm.totOp}</td>
                            <td style={{ textAlign: 'center' }}>{dm.totUt}</td>
                            <td style={{ textAlign: 'center' }}>{dm.totOp - dm.totUt}</td>
                            <td style={{ textAlign: 'center' }}>
                              <Pill ut={dm.totUt} op={dm.totOp} />
                              <Bar ut={dm.totUt} op={dm.totOp} />
                            </td>
                          </tr>
                          {dm.sos.map((so, si) => {
                            const sp = calcPct(so.totUt, so.totOp);
                            return (
                              <tr key={`so${di}${si}`}>
                                <td style={{ fontSize: 10 }}></td>
                                <td style={{ fontSize: 11, color: 'var(--text2)', paddingLeft: 22 }}>└ SO</td>
                                <td style={{ fontSize: 11 }}>{so.name}</td>
                                <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>—</td>
                                <td style={{ textAlign: 'center', fontSize: 11 }}>{so.totOp}</td>
                                <td style={{ textAlign: 'center', fontSize: 11 }}>{so.totUt}</td>
                                <td style={{ textAlign: 'center', fontSize: 11 }}>{so.totOp - so.totUt}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{ background: bgFn(sp), color: clrFn(sp), padding: '1px 8px',
                                    borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                                    {dotFn(sp)} {fmtPct(sp)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ④ Email */}
                <div className={styles.card}>
                  <div className={styles.emailHeader}>
                    <p className={styles.cardTitle} style={{ margin: 0 }}>④ Generate &amp; copy email for RSM</p>
                    <div className={styles.row} style={{ gap: 8 }}>
                      <button
                        className={styles.btn}
                        onClick={() => { setShowEmail(v => !v); setCopyMsg(''); }}
                      >
                        {showEmail ? 'Hide preview' : 'Preview email'}
                      </button>
                      {showEmail && (
                        <button className={styles.btnPrimary} onClick={selectAll}>
                          📋 Select &amp; Copy
                        </button>
                      )}
                    </div>
                  </div>

                  {copyMsg && (
                    <div className={styles.copyMsg}>
                      {copyMsg.startsWith('Copied') ? '✅ ' : 'ℹ️ '}{copyMsg}
                    </div>
                  )}

                  {showEmail && (
                    <>
                      <div className={styles.tip}>
                        💡 Click <strong>Select &amp; Copy</strong> → then <strong>Ctrl+C</strong> → paste into Outlook or Gmail.
                        Table formatting and colours are preserved.
                      </div>
                      <div
                        ref={emailRef}
                        dangerouslySetInnerHTML={{ __html: emailHtml }}
                        className={styles.emailPreview}
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
