'use client'
import { useState, useCallback, useRef } from 'react'
import {
  TrendingUp, TrendingDown, AlertTriangle, Zap, Target,
  Shield, BarChart2, MessageCircle, Globe, RefreshCw,
  Activity, ArrowUpRight, ArrowDownRight, Flame,
  BookOpen, Building2, Wifi
} from 'lucide-react'

type TradeMode = 'day' | 'swing' | 'long'
type Signal = 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL'
type TabId = 'technical' | 'options' | 'sentiment' | 'news' | 'fundamentals' | 'macro'

export default function ApexDashboard() {
  const [symbol, setSymbol] = useState('')
  const [mode, setMode] = useState<TradeMode>('swing')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('technical')
  const inputRef = useRef<HTMLInputElement>(null)

  const analyze = useCallback(async (sym?: string, m?: TradeMode) => {
    const s = (sym || symbol).toUpperCase().trim()
    const md = m || mode
    if (!s) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: s, mode: md }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed') }
      const result = await res.json()
      setData(result); setActiveTab('technical')
    } catch (e: any) { setError(e.message || 'Analysis failed') }
    finally { setLoading(false) }
  }, [symbol, mode])

  const quickSymbols = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'AMZN', 'MSFT', 'META', 'AMD', 'PLTR', 'GME']

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg)', zIndex: 1 }}>

      {/* HEADER */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,12,20,0.96)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
            <span className="display" style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '0.15em', color: 'var(--text-bright)' }}>
              APEX<span style={{ color: 'var(--accent)' }}>TRADER</span>
            </span>
          </div>
          {data && (
            <div style={{ display: 'flex', gap: '0.4rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border)' }}>
              {Object.entries(data.dataSources || {}).slice(0, 4).map(([k, v]: [string, any]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', background: 'rgba(0,212,255,0.06)', border: '1px solid var(--border)', borderRadius: 2 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)' }} />
                  <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            {(['day', 'swing', 'long'] as TradeMode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); if (data) analyze(data.symbol, m) }}
                className="display"
                style={{ padding: '0.25rem 0.8rem', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2, border: mode === m ? '1px solid var(--accent)' : '1px solid var(--border)', background: mode === m ? 'rgba(0,212,255,0.12)' : 'transparent', color: mode === m ? 'var(--accent)' : 'var(--muted)', transition: 'all 0.15s' }}>
                {m === 'day' ? '⚡ Day' : m === 'swing' ? '📈 Swing' : '🏦 Long'}
              </button>
            ))}
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
            {new Date().toLocaleTimeString('en-US', { hour12: false })} EST
          </span>
        </div>
      </header>

      {/* SEARCH */}
      <div style={{ padding: '1.25rem 1.5rem 0', display: 'flex', gap: '0.75rem', alignItems: 'center', maxWidth: '800px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span className="mono" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', pointerEvents: 'none' }}>$</span>
          <input ref={inputRef} className="apex-input" style={{ paddingLeft: '1.8rem' }}
            placeholder="TICKER SYMBOL (AAPL, TSLA, SPY...)" value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && analyze()} />
        </div>
        <button className="apex-btn" onClick={() => analyze()} disabled={loading || !symbol}>
          {loading ? <span className="loading">SCANNING...</span> : '▶ ANALYZE'}
        </button>
      </div>

      {/* QUICK SYMBOLS */}
      <div style={{ padding: '0.6rem 1.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {quickSymbols.map(s => (
          <button key={s} onClick={() => { setSymbol(s); analyze(s) }} className="mono"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.68rem', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 2, transition: 'all 0.12s' }}
            onMouseEnter={e => { (e.target as any).style.borderColor = 'var(--accent)'; (e.target as any).style.color = 'var(--accent)' }}
            onMouseLeave={e => { (e.target as any).style.borderColor = 'var(--border)'; (e.target as any).style.color = 'var(--muted)' }}>
            {s}
          </button>
        ))}
      </div>

      {error && <div style={{ margin: '0.75rem 1.5rem', padding: '0.6rem 1rem', background: 'rgba(255,51,85,0.08)', border: '1px solid rgba(255,51,85,0.3)', borderRadius: 2, color: 'var(--red)', fontSize: '0.82rem' }}>⚠ {error}</div>}

      {/* LOADING */}
      {loading && (
        <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <div className="display loading" style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.3em', color: 'var(--accent)' }}>SCANNING MARKETS</div>
          <div className="mono" style={{ marginTop: '0.5rem', color: 'var(--muted)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
            Alpaca · Twelve Data · Finnhub · FMP · FRED · Reddit
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
            {[0,1,2,3,4,5].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', animation: `pulse-data 1.2s ${i*0.12}s ease-in-out infinite` }} />)}
          </div>
        </div>
      )}

      {/* MAIN DASHBOARD */}
      {data && !loading && (
        <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gap: '0.85rem' }}>

          {/* ROW 1: Quote + Signal + Score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 190px 330px', gap: '0.85rem' }}>

            {/* Quote */}
            <div className="apex-card corner-bracket" style={{ padding: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="section-label">{data.quote.name || data.symbol}</div>
                  <div className="display" style={{ fontSize: '2.6rem', fontWeight: 900, color: 'var(--text-bright)', lineHeight: 1 }}>{data.symbol}</div>
                  <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.2rem' }}>via {data.quote.source}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--text-bright)' }}>${data.quote.price.toFixed(2)}</div>
                  <div className={`mono ${data.quote.changePercent >= 0 ? 'stat-up' : 'stat-down'}`} style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', marginTop: '0.1rem' }}>
                    {data.quote.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {data.quote.changePercent >= 0 ? '+' : ''}{data.quote.changePercent.toFixed(2)}%
                    <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>({data.quote.change >= 0 ? '+' : ''}${data.quote.change.toFixed(2)})</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
                {[
                  { l: 'OPEN', v: `$${data.quote.open?.toFixed(2)}` },
                  { l: 'HIGH', v: `$${data.quote.high?.toFixed(2)}`, c: 'var(--green)' },
                  { l: 'LOW', v: `$${data.quote.low?.toFixed(2)}`, c: 'var(--red)' },
                  { l: 'VOLUME', v: fmtVol(data.quote.volume) },
                  { l: 'PREV CLOSE', v: `$${data.quote.prevClose?.toFixed(2)}` },
                  { l: 'AVG VOL', v: fmtVol(data.quote.avgVolume) },
                  { l: 'MARKET CAP', v: fmtMktCap(data.quote.marketCap) },
                  { l: 'BETA', v: data.quote.beta?.toFixed(2) || '—' },
                ].map(item => (
                  <div key={item.l}>
                    <div className="section-label" style={{ fontSize: '0.55rem' }}>{item.l}</div>
                    <div className="mono" style={{ fontSize: '0.82rem', color: item.c || 'var(--text)' }}>{item.v || '—'}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span className="section-label" style={{ fontSize: '0.55rem' }}>VOL RATIO</span>
                  <span className="mono" style={{ fontSize: '0.7rem', color: data.tech.volumeRatio > 1.5 ? 'var(--green)' : 'var(--muted)' }}>{data.tech.volumeRatio.toFixed(2)}x avg</span>
                </div>
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, data.tech.volumeRatio * 38)}%`, background: data.tech.volumeRatio > 2 ? 'var(--green)' : data.tech.volumeRatio > 1 ? 'var(--accent)' : 'var(--muted)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            </div>

            {/* Signal */}
            <div className={`apex-card ${data.signal.includes('BUY') ? 'box-glow-green' : data.signal.includes('SELL') ? 'box-glow-red' : 'box-glow-accent'}`}
              style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div className="section-label">COMPOSITE SIGNAL</div>
              <div className={`display ${sigColor(data.signal)}`} style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.15, marginTop: '0.4rem', letterSpacing: '0.04em' }}>
                {data.signal}
              </div>
              <div style={{ marginTop: '0.6rem', padding: '0.15rem 0.6rem', borderRadius: 2, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--font-display)', background: convBg(data.conviction), border: `1px solid ${convBorder(data.conviction)}`, color: convColor(data.conviction) }}>
                {data.conviction} CONVICTION
              </div>
              <div className="mono" style={{ marginTop: '0.9rem', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                {data.score.total > 0 ? '+' : ''}{data.score.total.toFixed(2)}
              </div>
              <div className="section-label" style={{ fontSize: '0.52rem' }}>COMPOSITE SCORE /10</div>
              <div style={{ marginTop: '0.9rem', width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((data.score.total + 10) / 20) * 100}%`, background: 'linear-gradient(90deg, var(--red), var(--yellow), var(--green))', borderRadius: 3, transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>T:{data.score.trend}</span>
                <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>M:{data.score.momentum}</span>
                <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>V:{data.score.volume}</span>
                <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>S:{data.score.sentiment}</span>
                <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>F:{data.score.fundamental}</span>
                <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Mc:{data.score.macro}</span>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="apex-card" style={{ padding: '1.1rem' }}>
              <div className="section-label" style={{ marginBottom: '0.6rem' }}>SCORE BREAKDOWN — 7 DIMENSIONS</div>
              {[
                { label: 'TREND', val: data.score.trend, max: 2, source: 'MAs/VWAP' },
                { label: 'MOMENTUM', val: data.score.momentum, max: 2, source: 'RSI/MACD/BB' },
                { label: 'VOLUME', val: data.score.volume, max: 1, source: 'Vol Ratio' },
                { label: 'SENTIMENT', val: data.score.sentiment, max: 1, source: 'F&G/Social' },
                { label: 'VOLATILITY', val: data.score.volatility, max: 1, source: 'ATR' },
                { label: 'FUNDAMENTAL', val: data.score.fundamental, max: 2, source: 'FMP/DCF' },
                { label: 'MACRO', val: data.score.macro, max: 1, source: 'FRED' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="section-label" style={{ fontSize: '0.58rem' }}>{item.label}</span>
                      <span className="section-label" style={{ fontSize: '0.52rem', color: 'rgba(100,116,139,0.6)' }}>{item.source}</span>
                    </div>
                    <span className={`mono ${item.val > 0 ? 'stat-up' : item.val < 0 ? 'stat-down' : 'stat-neutral'}`} style={{ fontSize: '0.68rem' }}>
                      {item.val > 0 ? '+' : ''}{item.val.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border-bright)' }} />
                    <div style={{
                      height: '100%', borderRadius: 2, position: 'absolute',
                      left: item.val >= 0 ? '50%' : `${50 + (item.val / item.max) * 50}%`,
                      width: `${(Math.abs(item.val) / item.max) * 50}%`,
                      background: item.val > 0.3 ? 'var(--green)' : item.val < -0.3 ? 'var(--red)' : 'var(--yellow)',
                      transition: 'all 0.6s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI BRIEF */}
          <div className="apex-card" style={{ padding: '1rem 1.25rem', borderColor: 'var(--border-bright)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.35rem 0.6rem', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 2, flexShrink: 0 }}>
                <Zap size={14} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="section-label" style={{ marginBottom: '0.35rem', fontSize: '0.58rem' }}>
                  AI INTELLIGENCE BRIEF · {data.mode.toUpperCase()} · {data.signal} · {data.conviction} CONVICTION
                </div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.65, color: 'var(--text)' }}>{data.summary}</p>
              </div>
              <button onClick={() => analyze()} style={{ padding: '0.3rem', background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', borderRadius: 2, flexShrink: 0 }}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* PRICE TARGETS */}
          <div className="apex-card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
              <div className="section-label">PRICE TARGETS · {data.mode.toUpperCase()} TIMEFRAME</div>
              {data.priceTargets.analystMean && (
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent)' }}>
                  Analyst Mean: ${data.priceTargets.analystMean.toFixed(2)} · DCF: ${data.priceTargets.dcfFairValue?.toFixed(2) || '—'}
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.6rem' }}>
              {[
                { l: 'STOP LOSS', v: data.priceTargets.stopLoss, c: 'var(--red)', g: 'glow-red' },
                { l: 'SUPPORT 2', v: data.priceTargets.support2, c: '#ff7799' },
                { l: 'SUPPORT 1', v: data.priceTargets.support1, c: '#ffaaaa' },
                { l: 'PIVOT', v: data.priceTargets.dayPivot, c: 'var(--yellow)', g: 'glow-yellow' },
                { l: 'RESIST 1', v: data.priceTargets.resistance1, c: '#aaffcc' },
                { l: 'TARGET 1', v: data.priceTargets.target1, c: '#66ffaa' },
                { l: 'TARGET 2', v: data.priceTargets.target2, c: '#33ff99' },
                { l: 'TARGET 3', v: data.priceTargets.target3, c: 'var(--green)', g: 'glow-green' },
              ].map(item => (
                <div key={item.l} style={{ textAlign: 'center', padding: '0.6rem 0.4rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, borderTopColor: item.c, borderTopWidth: 2 }}>
                  <div className="section-label" style={{ fontSize: '0.52rem', marginBottom: '0.3rem' }}>{item.l}</div>
                  <div className={`mono ${item.g || ''}`} style={{ fontSize: '0.85rem', fontWeight: 700, color: item.c }}>${item.v.toFixed(2)}</div>
                  <div className="section-label" style={{ fontSize: '0.52rem', marginTop: '0.25rem', color: 'var(--muted)' }}>
                    {item.v > data.quote.price ? '+' : ''}{(((item.v - data.quote.price) / data.quote.price) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TABS */}
          <div>
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
              {[
                { id: 'technical', icon: <BarChart2 size={12} />, label: 'TECHNICALS' },
                { id: 'options', icon: <Target size={12} />, label: 'OPTIONS' },
                { id: 'fundamentals', icon: <BookOpen size={12} />, label: 'FUNDAMENTALS' },
                { id: 'macro', icon: <Building2 size={12} />, label: 'MACRO / FRED' },
                { id: 'sentiment', icon: <MessageCircle size={12} />, label: 'SENTIMENT' },
                { id: 'news', icon: <Globe size={12} />, label: 'CATALYSTS' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as TabId)} className="display"
                  style={{ padding: '0.55rem 1.2rem', background: activeTab === tab.id ? 'var(--card)' : 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="apex-card" style={{ borderTop: 'none', borderRadius: '0 0 2px 2px', padding: '1.25rem' }}>

              {/* ══ TECHNICALS ══ */}
              {activeTab === 'technical' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>KEY INDICATORS <span style={{ color: 'var(--muted)', fontSize: '0.55rem' }}>via {data.tech.source}</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      {[
                        { l: 'RSI (14)', v: data.tech.rsi14.toFixed(1), s: rsiStatus(data.tech.rsi14) },
                        { l: 'MACD Hist', v: data.tech.macdHist.toFixed(3), s: data.tech.macdHist > 0 ? 'bull' : 'bear' },
                        { l: 'Stoch %K', v: data.tech.stochK.toFixed(1), s: data.tech.stochK < 25 ? 'bull' : data.tech.stochK > 75 ? 'bear' : 'neutral' },
                        { l: 'ADX', v: data.tech.adx.toFixed(1), s: data.tech.adx > 25 ? 'bull' : 'neutral' },
                        { l: 'BB Width', v: (data.tech.bbWidth * 100).toFixed(2) + '%', s: data.tech.bbWidth < 0.04 ? 'neutral' : 'neutral' },
                        { l: 'ATR (14)', v: `$${data.tech.atr14.toFixed(2)}`, s: 'neutral' },
                        { l: 'Vol Ratio', v: `${data.tech.volumeRatio.toFixed(2)}x`, s: data.tech.volumeRatio > 1.5 ? 'bull' : data.tech.volumeRatio < 0.7 ? 'bear' : 'neutral' },
                        { l: 'vs SMA200', v: `${data.tech.priceVsSma200 > 0 ? '+' : ''}${data.tech.priceVsSma200.toFixed(1)}%`, s: data.tech.priceVsSma200 > 0 ? 'bull' : 'bear' },
                      ].map(item => (
                        <div key={item.l} style={{ padding: '0.5rem 0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', justifyContent: 'space-between' }}>
                          <span className="section-label" style={{ fontSize: '0.58rem' }}>{item.l}</span>
                          <span className="mono" style={{ fontSize: '0.78rem', color: item.s === 'bull' ? 'var(--green)' : item.s === 'bear' ? 'var(--red)' : 'var(--yellow)' }}>{item.v}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div className="section-label" style={{ marginBottom: '0.5rem' }}>MOVING AVERAGE STACK</div>
                      {[
                        { l: 'EMA 9', v: data.tech.ema9, above: data.quote.price > data.tech.ema9 },
                        { l: 'EMA 21', v: data.tech.ema21, above: data.quote.price > data.tech.ema21 },
                        { l: 'SMA 20', v: data.tech.sma20, above: data.quote.price > data.tech.sma20 },
                        { l: 'VWAP', v: data.tech.vwap, above: data.quote.price > data.tech.vwap },
                        { l: 'SMA 50', v: data.tech.sma50, above: data.quote.price > data.tech.sma50 },
                        { l: 'SMA 200', v: data.tech.sma200, above: data.quote.price > data.tech.sma200 },
                      ].map(item => (
                        <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
                          <span className="section-label" style={{ fontSize: '0.58rem', width: '55px' }}>{item.l}</span>
                          <div style={{ flex: 1, margin: '0 0.6rem' }}>
                            <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, position: 'relative' }}>
                              <div style={{ position: 'absolute', left: `${Math.max(0, Math.min(95, 50 + (data.quote.price - item.v) / item.v * 200))}%`, top: -3, width: 8, height: 8, borderRadius: '50%', background: item.above ? 'var(--green)' : 'var(--red)', transform: 'translateX(-50%)' }} />
                            </div>
                          </div>
                          <span className="mono" style={{ fontSize: '0.72rem', color: item.above ? 'var(--green)' : 'var(--red)', width: '65px', textAlign: 'right' }}>${item.v.toFixed(2)}</span>
                          <span style={{ width: 14, marginLeft: '0.4rem' }}>
                            {item.above ? <ArrowUpRight size={11} color="var(--green)" /> : <ArrowDownRight size={11} color="var(--red)" />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>INDICATOR GAUGES</div>

                    {/* RSI */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span className="section-label">RSI (14)</span>
                        <span className="mono" style={{ fontSize: '0.82rem', color: rsiColor(data.tech.rsi14) }}>{data.tech.rsi14.toFixed(1)} — {rsiLabel(data.tech.rsi14)}</span>
                      </div>
                      <div style={{ height: 14, background: 'linear-gradient(90deg, var(--red), var(--yellow), var(--green))', borderRadius: 2, position: 'relative' }}>
                        {[30, 70].map(x => <div key={x} style={{ position: 'absolute', left: `${x}%`, top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.5)' }} />)}
                        <div style={{ position: 'absolute', left: `${data.tech.rsi14}%`, top: -3, width: 3, height: 20, background: 'white', borderRadius: 2, transform: 'translateX(-50%)', boxShadow: '0 0 6px rgba(255,255,255,0.8)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                        <span className="section-label" style={{ fontSize: '0.52rem', color: 'var(--red)' }}>OVERSOLD 30</span>
                        <span className="section-label" style={{ fontSize: '0.52rem', color: 'var(--green)' }}>OVERBOUGHT 70</span>
                      </div>
                    </div>

                    {/* Bollinger */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span className="section-label">BOLLINGER BANDS</span>
                        <span className="mono" style={{ fontSize: '0.72rem', color: data.tech.bbWidth < 0.04 ? 'var(--yellow)' : 'var(--accent)' }}>
                          {(data.tech.bbWidth * 100).toFixed(1)}% width{data.tech.bbWidth < 0.04 ? ' ⚡ SQUEEZE' : ''}
                        </span>
                      </div>
                      <div style={{ height: 12, background: 'var(--border)', borderRadius: 2, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: `${Math.max(0, Math.min(96, ((data.quote.price - data.tech.bbLower) / (data.tech.bbUpper - data.tech.bbLower)) * 100))}%`, top: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)', transform: 'translateX(-50%)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                        <span className="section-label" style={{ fontSize: '0.5rem' }}>LOW ${data.tech.bbLower.toFixed(2)}</span>
                        <span className="section-label" style={{ fontSize: '0.5rem' }}>MID ${data.tech.bbMiddle.toFixed(2)}</span>
                        <span className="section-label" style={{ fontSize: '0.5rem' }}>HIGH ${data.tech.bbUpper.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Stochastic */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span className="section-label">STOCHASTIC %K/%D</span>
                        <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{data.tech.stochK.toFixed(1)} / {data.tech.stochD.toFixed(1)}</span>
                      </div>
                      <div style={{ height: 12, background: 'var(--border)', borderRadius: 2, position: 'relative' }}>
                        {[20, 80].map(x => <div key={x} style={{ position: 'absolute', left: `${x}%`, top: 0, bottom: 0, width: 1, background: 'rgba(155,89,255,0.3)' }} />)}
                        <div style={{ position: 'absolute', left: `${data.tech.stochK}%`, top: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--purple)', border: '2px solid var(--bg)', transform: 'translateX(-50%)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                        <span className="section-label" style={{ fontSize: '0.5rem', color: 'var(--green)' }}>OVERSOLD 20</span>
                        <span className="section-label" style={{ fontSize: '0.5rem', color: 'var(--red)' }}>OVERBOUGHT 80</span>
                      </div>
                    </div>

                    {/* Risk Flags */}
                    {data.risks.length > 0 && (
                      <div>
                        <div className="section-label" style={{ marginBottom: '0.4rem', fontSize: '0.58rem' }}>⚠ RISK FLAGS</div>
                        {data.risks.map((r: string, i: number) => (
                          <div key={i} style={{ padding: '0.35rem 0.55rem', marginBottom: '0.3rem', background: 'rgba(255,51,85,0.05)', border: '1px solid rgba(255,51,85,0.15)', borderRadius: 2, fontSize: '0.75rem', color: '#ff8899', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                            <AlertTriangle size={10} color="var(--red)" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                            {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══ OPTIONS ══ */}
              {activeTab === 'options' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div style={{ padding: '1rem', marginBottom: '0.85rem', background: 'var(--surface)', border: `1px solid ${data.signal.includes('BUY') ? 'rgba(0,255,136,0.3)' : data.signal.includes('SELL') ? 'rgba(255,51,85,0.3)' : 'var(--border)'}`, borderRadius: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <div className="display" style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-bright)' }}>{data.optionsRec.strategy}</div>
                        <div style={{ padding: '0.15rem 0.5rem', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--font-display)', borderRadius: 2, background: riskBg(data.optionsRec.riskLevel), border: `1px solid ${riskBorder(data.optionsRec.riskLevel)}`, color: riskColor(data.optionsRec.riskLevel) }}>
                          {data.optionsRec.riskLevel} RISK
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '0.85rem' }}>{data.optionsRec.reasoning}</p>
                      {data.optionsRec.legs.length > 0 && (
                        <div>
                          <div className="section-label" style={{ marginBottom: '0.4rem', fontSize: '0.58rem' }}>TRADE LEGS</div>
                          {data.optionsRec.legs.map((leg: any, i: number) => (
                            <div key={i} style={{ padding: '0.5rem 0.65rem', marginBottom: '0.3rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <span style={{ padding: '0.1rem 0.35rem', fontSize: '0.6rem', fontWeight: 700, fontFamily: 'var(--font-display)', borderRadius: 2, background: leg.action === 'BUY' ? 'rgba(0,255,136,0.15)' : 'rgba(255,51,85,0.15)', color: leg.action === 'BUY' ? 'var(--green)' : 'var(--red)' }}>{leg.action}</span>
                                <span className="mono" style={{ fontSize: '0.78rem', color: leg.type === 'CALL' ? 'var(--green)' : 'var(--red)' }}>{leg.type}</span>
                                <span className="mono" style={{ fontSize: '0.78rem' }}>{leg.strike}</span>
                                <span className="section-label" style={{ fontSize: '0.55rem' }}>{leg.expiration}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div className="section-label" style={{ fontSize: '0.52rem' }}>COST</div>
                                  <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--yellow)' }}>{leg.estimatedCost}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div className="section-label" style={{ fontSize: '0.52rem' }}>DELTA</div>
                                  <div className="mono" style={{ fontSize: '0.72rem' }}>{leg.targetDelta}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      {[
                        { l: 'MAX PROFIT', v: data.optionsRec.maxProfit, c: 'var(--green)' },
                        { l: 'MAX LOSS', v: data.optionsRec.maxLoss, c: 'var(--red)' },
                        { l: 'BREAKEVEN', v: data.optionsRec.breakeven, c: 'var(--yellow)' },
                        { l: 'IDEAL ENTRY', v: data.optionsRec.idealEntry, c: 'var(--accent)' },
                      ].map(item => (
                        <div key={item.l} style={{ padding: '0.55rem 0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2 }}>
                          <div className="section-label" style={{ fontSize: '0.55rem', marginBottom: '0.25rem' }}>{item.l}</div>
                          <div className="mono" style={{ fontSize: '0.75rem', color: item.c }}>{item.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '0.65rem 0.75rem', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 2 }}>
                      <div className="section-label" style={{ fontSize: '0.55rem', marginBottom: '0.25rem' }}>EXIT STRATEGY</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{data.optionsRec.idealExit}</div>
                    </div>
                  </div>
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.65rem' }}>LIVE OPTIONS CHAIN <span style={{ color: 'var(--muted)', fontSize: '0.52rem' }}>via Finnhub</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {['calls', 'puts'].map(type => (
                        <div key={type}>
                          <div className="section-label" style={{ fontSize: '0.58rem', marginBottom: '0.35rem', textAlign: 'center', color: type === 'calls' ? 'var(--green)' : 'var(--red)' }}>{type.toUpperCase()}</div>
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.1rem', marginBottom: '0.2rem', padding: '0.2rem 0', borderBottom: '1px solid var(--border)' }}>
                              {['STRIKE', 'BID', 'ASK', 'IV'].map(h => <span key={h} className="section-label" style={{ fontSize: '0.5rem', textAlign: 'center' }}>{h}</span>)}
                            </div>
                            {(data.optionsRec.bestContracts || []).filter((c: any) => c.type === (type === 'calls' ? 'call' : 'put')).slice(0, 6).map((c: any, i: number) => (
                              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.1rem', padding: '0.22rem 0.1rem', borderBottom: '1px solid rgba(30,41,59,0.4)', background: c.inTheMoney ? 'rgba(0,212,255,0.04)' : 'transparent' }}>
                                <span className="mono" style={{ textAlign: 'center', color: c.inTheMoney ? 'var(--accent)' : 'var(--text)', fontSize: '0.68rem' }}>${c.strike}</span>
                                <span className="mono" style={{ textAlign: 'center', color: 'var(--red)', fontSize: '0.68rem' }}>{c.bid?.toFixed(2)}</span>
                                <span className="mono" style={{ textAlign: 'center', color: 'var(--green)', fontSize: '0.68rem' }}>{c.ask?.toFixed(2)}</span>
                                <span className="mono" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.65rem' }}>{((c.impliedVolatility || 0) * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ══ FUNDAMENTALS ══ */}
              {activeTab === 'fundamentals' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

                  {/* Valuation */}
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>VALUATION <span style={{ color: 'var(--muted)', fontSize: '0.52rem' }}>via FMP</span></div>

                    {/* DCF */}
                    <div style={{ padding: '0.85rem', background: 'var(--surface)', border: `1px solid ${data.fundamentals.dcfUpside > 5 ? 'rgba(0,255,136,0.25)' : data.fundamentals.dcfUpside < -5 ? 'rgba(255,51,85,0.25)' : 'var(--border)'}`, borderRadius: 2, marginBottom: '0.75rem' }}>
                      <div className="section-label" style={{ fontSize: '0.58rem', marginBottom: '0.4rem' }}>DCF FAIR VALUE</div>
                      <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: data.fundamentals.dcfUpside > 5 ? 'var(--green)' : data.fundamentals.dcfUpside < -5 ? 'var(--red)' : 'var(--yellow)' }}>
                        ${data.fundamentals.dcfValue.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: data.fundamentals.dcfUpside > 0 ? 'var(--green)' : 'var(--red)' }}>
                        {data.fundamentals.dcfUpside > 0 ? '+' : ''}{data.fundamentals.dcfUpside.toFixed(1)}% vs current price
                      </div>
                      <div style={{ marginTop: '0.5rem', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, 50 + data.fundamentals.dcfUpside * 2))}%`, background: data.fundamentals.dcfUpside > 0 ? 'var(--green)' : 'var(--red)', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      {[
                        { l: 'P/E TTM', v: data.fundamentals.pe?.toFixed(1) || '—' },
                        { l: 'P/B', v: data.fundamentals.pb?.toFixed(2) || '—' },
                        { l: 'P/S', v: data.fundamentals.ps?.toFixed(2) || '—' },
                        { l: 'EV/EBITDA', v: data.fundamentals.evEbitda?.toFixed(1) || '—' },
                        { l: 'GROSS MARGIN', v: `${data.fundamentals.grossMargin?.toFixed(1)}%`, c: data.fundamentals.grossMargin > 40 ? 'var(--green)' : 'var(--text)' },
                        { l: 'NET MARGIN', v: `${data.fundamentals.netMargin?.toFixed(1)}%`, c: data.fundamentals.netMargin > 15 ? 'var(--green)' : data.fundamentals.netMargin < 0 ? 'var(--red)' : 'var(--text)' },
                        { l: 'ROE', v: `${data.fundamentals.roe?.toFixed(1)}%`, c: data.fundamentals.roe > 15 ? 'var(--green)' : 'var(--text)' },
                        { l: 'D/E RATIO', v: data.fundamentals.debtToEquity?.toFixed(2) || '—', c: data.fundamentals.debtToEquity > 2 ? 'var(--red)' : 'var(--text)' },
                      ].map(item => (
                        <div key={item.l} style={{ padding: '0.45rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', justifyContent: 'space-between' }}>
                          <span className="section-label" style={{ fontSize: '0.55rem' }}>{item.l}</span>
                          <span className="mono" style={{ fontSize: '0.76rem', color: (item as any).c || 'var(--text)' }}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Analyst + Earnings */}
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>ANALYST CONSENSUS</div>
                    <div style={{ padding: '0.85rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, marginBottom: '0.75rem', textAlign: 'center' }}>
                      <div className="display" style={{ fontSize: '1.3rem', fontWeight: 900, color: getConsensusColor(data.fundamentals.analystConsensus) }}>{data.fundamentals.analystConsensus}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div className="mono" style={{ fontSize: '1.1rem', color: 'var(--green)' }}>{data.fundamentals.analystBuy}</div>
                          <div className="section-label" style={{ fontSize: '0.52rem' }}>BUY</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div className="mono" style={{ fontSize: '1.1rem', color: 'var(--yellow)' }}>{data.fundamentals.analystHold}</div>
                          <div className="section-label" style={{ fontSize: '0.52rem' }}>HOLD</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div className="mono" style={{ fontSize: '1.1rem', color: 'var(--red)' }}>{data.fundamentals.analystSell}</div>
                          <div className="section-label" style={{ fontSize: '0.52rem' }}>SELL</div>
                        </div>
                      </div>
                      {/* Bull/Bear bar */}
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ height: '100%', width: `${(data.fundamentals.analystBuy / (data.fundamentals.analystBuy + data.fundamentals.analystHold + data.fundamentals.analystSell || 1)) * 100}%`, background: 'var(--green)' }} />
                          <div style={{ height: '100%', width: `${(data.fundamentals.analystHold / (data.fundamentals.analystBuy + data.fundamentals.analystHold + data.fundamentals.analystSell || 1)) * 100}%`, background: 'var(--yellow)' }} />
                          <div style={{ height: '100%', flex: 1, background: 'var(--red)' }} />
                        </div>
                      </div>
                    </div>

                    {/* Price Targets */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div className="section-label" style={{ marginBottom: '0.4rem' }}>ANALYST PRICE TARGETS</div>
                      {[
                        { l: 'HIGH TARGET', v: `$${data.fundamentals.analystTargetHigh.toFixed(2)}`, pct: ((data.fundamentals.analystTargetHigh - data.quote.price) / data.quote.price * 100), c: 'var(--green)' },
                        { l: 'MEAN TARGET', v: `$${data.fundamentals.analystTargetMean.toFixed(2)}`, pct: ((data.fundamentals.analystTargetMean - data.quote.price) / data.quote.price * 100), c: 'var(--accent)' },
                        { l: 'LOW TARGET', v: `$${data.fundamentals.analystTargetLow.toFixed(2)}`, pct: ((data.fundamentals.analystTargetLow - data.quote.price) / data.quote.price * 100), c: '#ff8899' },
                      ].map(item => (
                        <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                          <span className="section-label" style={{ fontSize: '0.58rem' }}>{item.l}</span>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <span className="mono" style={{ fontSize: '0.8rem', color: item.c }}>{item.v}</span>
                            <span className="mono" style={{ fontSize: '0.72rem', color: item.pct >= 0 ? 'var(--green)' : 'var(--red)' }}>{item.pct >= 0 ? '+' : ''}{item.pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Earnings */}
                    <div className="section-label" style={{ marginBottom: '0.4rem' }}>EARNINGS</div>
                    <div style={{ padding: '0.65rem 0.75rem', background: data.fundamentals.daysToEarnings <= 14 ? 'rgba(255,215,0,0.06)' : 'var(--surface)', border: `1px solid ${data.fundamentals.daysToEarnings <= 14 ? 'rgba(255,215,0,0.25)' : 'var(--border)'}`, borderRadius: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span className="section-label" style={{ fontSize: '0.55rem' }}>NEXT EARNINGS</span>
                        <span className="mono" style={{ fontSize: '0.78rem', color: data.fundamentals.daysToEarnings <= 14 ? 'var(--yellow)' : 'var(--text)' }}>
                          {data.fundamentals.nextEarningsDate} {data.fundamentals.daysToEarnings <= 90 ? `(${data.fundamentals.daysToEarnings}d)` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="section-label" style={{ fontSize: '0.55rem' }}>LAST EPS SURPRISE</span>
                        <span className="mono" style={{ fontSize: '0.78rem', color: data.fundamentals.lastEpsSurprise >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {data.fundamentals.lastEpsSurprise >= 0 ? '+' : ''}{data.fundamentals.lastEpsSurprise.toFixed(1)}% ({data.fundamentals.lastEpsActual.toFixed(2)} vs est. {data.fundamentals.lastEpsEstimate.toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Insider + Financial Health */}
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>INSIDER ACTIVITY <span style={{ color: 'var(--muted)', fontSize: '0.52rem' }}>90 DAYS</span></div>
                    <div style={{ padding: '0.85rem', background: 'var(--surface)', border: `1px solid ${data.fundamentals.insiderSentiment === 'BUYING' ? 'rgba(0,255,136,0.25)' : data.fundamentals.insiderSentiment === 'SELLING' ? 'rgba(255,51,85,0.25)' : 'var(--border)'}`, borderRadius: 2, marginBottom: '0.75rem' }}>
                      <div className="display" style={{ fontSize: '1.1rem', fontWeight: 900, color: data.fundamentals.insiderSentiment === 'BUYING' ? 'var(--green)' : data.fundamentals.insiderSentiment === 'SELLING' ? 'var(--red)' : 'var(--yellow)' }}>
                        INSIDERS {data.fundamentals.insiderSentiment}
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.6rem' }}>
                        <div>
                          <div className="mono" style={{ fontSize: '1rem', color: 'var(--green)' }}>{data.fundamentals.insiderBuys}</div>
                          <div className="section-label" style={{ fontSize: '0.5rem' }}>PURCHASES</div>
                        </div>
                        <div>
                          <div className="mono" style={{ fontSize: '1rem', color: 'var(--red)' }}>{data.fundamentals.insiderSells}</div>
                          <div className="section-label" style={{ fontSize: '0.5rem' }}>SALES</div>
                        </div>
                        <div>
                          <div className="mono" style={{ fontSize: '0.85rem', color: data.fundamentals.insiderNetShares >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {data.fundamentals.insiderNetShares >= 0 ? '+' : ''}{fmtVol(Math.abs(data.fundamentals.insiderNetShares))}
                          </div>
                          <div className="section-label" style={{ fontSize: '0.5rem' }}>NET SHARES</div>
                        </div>
                      </div>
                    </div>

                    <div className="section-label" style={{ marginBottom: '0.5rem' }}>FINANCIAL HEALTH</div>
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {[
                        { l: 'CURRENT RATIO', v: data.fundamentals.currentRatio?.toFixed(2), good: data.fundamentals.currentRatio > 1.5 },
                        { l: 'FCF/SHARE', v: `$${data.fundamentals.freeCashFlowPerShare?.toFixed(2)}`, good: data.fundamentals.freeCashFlowPerShare > 0 },
                        { l: 'REV GROWTH YoY', v: `${data.fundamentals.revenueGrowthYoy?.toFixed(1)}%`, good: data.fundamentals.revenueGrowthYoy > 5 },
                        { l: 'EPS GROWTH YoY', v: `${data.fundamentals.epsGrowthYoy?.toFixed(1)}%`, good: data.fundamentals.epsGrowthYoy > 5 },
                        { l: 'INST. OWNERSHIP', v: `${data.fundamentals.institutionalOwnership?.toFixed(1)}%`, good: true },
                      ].map(item => (
                        <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.38rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2 }}>
                          <span className="section-label" style={{ fontSize: '0.56rem' }}>{item.l}</span>
                          <span className="mono" style={{ fontSize: '0.76rem', color: item.good ? 'var(--green)' : 'var(--red)' }}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ══ MACRO / FRED ══ */}
              {activeTab === 'macro' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

                  {/* Fed Policy */}
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>FED POLICY <span style={{ color: 'var(--muted)', fontSize: '0.52rem' }}>via FRED</span></div>
                    <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, marginBottom: '0.75rem', textAlign: 'center' }}>
                      <div className="section-label" style={{ marginBottom: '0.3rem' }}>FED FUNDS RATE</div>
                      <div className="mono glow-accent" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                        {data.macro.fedFundsRate.toFixed(2)}%
                      </div>
                      <div style={{ marginTop: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 2, display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', background: data.macro.rateEnvironment === 'CUTTING' ? 'rgba(0,255,136,0.12)' : data.macro.rateEnvironment === 'HIKING' ? 'rgba(255,51,85,0.12)' : 'rgba(255,215,0,0.12)', color: data.macro.rateEnvironment === 'CUTTING' ? 'var(--green)' : data.macro.rateEnvironment === 'HIKING' ? 'var(--red)' : 'var(--yellow)' }}>
                        {data.macro.rateEnvironment}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {[
                        { l: 'INFLATION (CPI YoY)', v: `${data.macro.cpiYoy.toFixed(1)}%`, status: data.macro.inflationTrend, c: data.macro.cpiYoy > 4 ? 'var(--red)' : data.macro.cpiYoy < 2.5 ? 'var(--green)' : 'var(--yellow)' },
                        { l: 'CORE PCE YoY', v: `${data.macro.corePceYoy.toFixed(1)}%`, status: '', c: data.macro.corePceYoy > 3 ? 'var(--red)' : 'var(--yellow)' },
                        { l: 'UNEMPLOYMENT', v: `${data.macro.unemploymentRate.toFixed(1)}%`, status: '', c: data.macro.unemploymentRate < 4 ? 'var(--green)' : data.macro.unemploymentRate > 5 ? 'var(--red)' : 'var(--yellow)' },
                        { l: 'GDP GROWTH', v: `${data.macro.gdpGrowth.toFixed(1)}%`, status: '', c: data.macro.gdpGrowth > 2 ? 'var(--green)' : data.macro.gdpGrowth < 0 ? 'var(--red)' : 'var(--yellow)' },
                        { l: 'M2 GROWTH YoY', v: `${data.macro.m2Growth.toFixed(1)}%`, status: '', c: data.macro.m2Growth > 5 ? 'var(--green)' : 'var(--muted)' },
                      ].map(item => (
                        <div key={item.l} style={{ padding: '0.42rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="section-label" style={{ fontSize: '0.56rem' }}>{item.l}</span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {item.status && <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--muted)' }}>{item.status}</span>}
                            <span className="mono" style={{ fontSize: '0.78rem', color: item.c }}>{item.v}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Yield Curve */}
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>YIELD CURVE ANALYSIS</div>
                    <div style={{ padding: '1rem', background: 'var(--surface)', border: `1px solid ${data.macro.yieldCurveStatus === 'INVERTED' ? 'rgba(255,51,85,0.35)' : data.macro.yieldCurveStatus === 'FLAT' ? 'rgba(255,215,0,0.25)' : 'rgba(0,255,136,0.25)'}`, borderRadius: 2, marginBottom: '0.75rem', textAlign: 'center' }}>
                      <div className="section-label" style={{ marginBottom: '0.3rem' }}>10Y - 2Y SPREAD</div>
                      <div className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: data.macro.yieldCurve10Y2Y < 0 ? 'var(--red)' : data.macro.yieldCurve10Y2Y < 0.3 ? 'var(--yellow)' : 'var(--green)' }}>
                        {data.macro.yieldCurve10Y2Y > 0 ? '+' : ''}{data.macro.yieldCurve10Y2Y.toFixed(2)}%
                      </div>
                      <div className="display" style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.3rem', color: data.macro.yieldCurveStatus === 'INVERTED' ? 'var(--red)' : data.macro.yieldCurveStatus === 'FLAT' ? 'var(--yellow)' : 'var(--green)' }}>
                        {data.macro.yieldCurveStatus}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, marginBottom: '0.75rem' }}>
                      <div className="section-label" style={{ fontSize: '0.56rem', marginBottom: '0.35rem' }}>10Y - 3M SPREAD</div>
                      <div className="mono" style={{ fontSize: '0.9rem', color: data.macro.yieldCurve10Y3M < 0 ? 'var(--red)' : 'var(--text)' }}>
                        {data.macro.yieldCurve10Y3M > 0 ? '+' : ''}{data.macro.yieldCurve10Y3M.toFixed(2)}%
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2 }}>
                      <div className="section-label" style={{ fontSize: '0.56rem', marginBottom: '0.35rem' }}>YIELD CURVE INTERPRETATION</div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.55 }}>
                        {data.macro.yieldCurveStatus === 'INVERTED'
                          ? 'Inverted yield curve is a historically reliable recession predictor (12-18 month lead time). Risk-off positioning recommended for long-term holds.'
                          : data.macro.yieldCurveStatus === 'FLAT'
                          ? 'Flat yield curve signals economic uncertainty. Banks compress margins, credit conditions tighten gradually.'
                          : 'Normal yield curve supports economic expansion. Positive for financial sector and risk assets broadly.'}
                      </p>
                    </div>
                  </div>

                  {/* Macro Signal + Equity Impact */}
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>MACRO EQUITY SIGNAL</div>
                    <div style={{ padding: '1rem', background: 'var(--surface)', border: `1px solid ${data.macro.macroScore > 0 ? 'rgba(0,255,136,0.25)' : data.macro.macroScore < 0 ? 'rgba(255,51,85,0.25)' : 'var(--border)'}`, borderRadius: 2, marginBottom: '0.75rem', textAlign: 'center' }}>
                      <div className="section-label" style={{ marginBottom: '0.3rem' }}>MACRO SCORE FOR EQUITIES</div>
                      <div className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: data.macro.macroScore > 0 ? 'var(--green)' : data.macro.macroScore < 0 ? 'var(--red)' : 'var(--yellow)' }}>
                        {data.macro.macroScore > 0 ? '+' : ''}{data.macro.macroScore.toFixed(2)}<span style={{ fontSize: '1rem', color: 'var(--muted)' }}>/3</span>
                      </div>
                      <div style={{ marginTop: '0.6rem', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${((data.macro.macroScore + 3) / 6) * 100}%`, background: 'linear-gradient(90deg, var(--red), var(--yellow), var(--green))', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {[
                        { l: 'RECESSION RISK', v: data.macro.recessionRisk, c: data.macro.recessionRisk === 'LOW' ? 'var(--green)' : data.macro.recessionRisk === 'ELEVATED' ? 'var(--yellow)' : 'var(--red)' },
                        { l: 'RATE ENVIRONMENT', v: data.macro.rateEnvironment, c: data.macro.rateEnvironment === 'CUTTING' ? 'var(--green)' : data.macro.rateEnvironment === 'HIKING' ? 'var(--red)' : 'var(--yellow)' },
                        { l: 'INFLATION TREND', v: data.macro.inflationTrend, c: data.macro.inflationTrend === 'COOLING' ? 'var(--green)' : data.macro.inflationTrend === 'RISING' ? 'var(--red)' : 'var(--yellow)' },
                        { l: 'YIELD CURVE', v: data.macro.yieldCurveStatus, c: data.macro.yieldCurveStatus === 'NORMAL' ? 'var(--green)' : data.macro.yieldCurveStatus === 'INVERTED' ? 'var(--red)' : 'var(--yellow)' },
                      ].map(item => (
                        <div key={item.l} style={{ padding: '0.42rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', justifyContent: 'space-between' }}>
                          <span className="section-label" style={{ fontSize: '0.56rem' }}>{item.l}</span>
                          <span className="display" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: item.c }}>{item.v}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.75rem', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 2 }}>
                      <div className="section-label" style={{ fontSize: '0.55rem', marginBottom: '0.3rem' }}>MACRO IMPACT ON THIS TRADE</div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5 }}>
                        {data.macro.rateEnvironment === 'CUTTING' && data.macro.inflationTrend !== 'RISING'
                          ? 'Rate cuts in a cooling inflation environment historically support multiple expansion. Favorable macro for equity longs.'
                          : data.macro.rateEnvironment === 'HOLDING' && data.macro.recessionRisk === 'LOW'
                          ? 'Stable rates with low recession risk — neutral macro backdrop. Stock selection and technicals drive alpha.'
                          : data.macro.recessionRisk === 'HIGH' || data.macro.yieldCurveStatus === 'INVERTED'
                          ? 'Elevated macro risk. Reduce position size, favor defensive names, consider hedging long positions with puts.'
                          : 'Mixed macro signals. Keep position sizes moderate and monitor Fed communication closely.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ SENTIMENT ══ */}
              {activeTab === 'sentiment' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>FEAR & GREED INDEX</div>
                    <div style={{ textAlign: 'center' }}>
                      <FearGreedGauge value={data.sentiment.fearGreedIndex} label={data.sentiment.fearGreedLabel} />
                    </div>
                    <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2 }}>
                      <div className="section-label" style={{ marginBottom: '0.35rem', fontSize: '0.56rem' }}>INTERPRETATION</div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5 }}>
                        {data.sentiment.fearGreedIndex < 25 ? 'Extreme fear historically marks market bottoms — strong contrarian buy signal for patient longs.' :
                          data.sentiment.fearGreedIndex < 45 ? 'Fear present — selective opportunity for buyers if technicals confirm.' :
                            data.sentiment.fearGreedIndex < 55 ? 'Neutral sentiment — wait for clear directional signal.' :
                              data.sentiment.fearGreedIndex < 75 ? 'Greed building — be selective, valuations may be stretched in momentum names.' :
                                'Extreme greed — complacency elevated. Historically precedes corrections. Tighten stops.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>SOCIAL SENTIMENT</div>
                    <div style={{ display: 'grid', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      {[
                        { l: 'Reddit Mentions (24h)', v: `${data.sentiment.redditMentions} posts`, c: 'var(--accent)' },
                        { l: 'Reddit Sentiment Score', v: `${(data.sentiment.redditSentimentScore * 100).toFixed(0)}/100`, c: data.sentiment.redditSentimentScore > 0 ? 'var(--green)' : 'var(--red)' },
                        { l: 'Twitter/X Volume (est.)', v: `${data.sentiment.twitterVolume} mentions`, c: 'var(--purple)' },
                        { l: 'Social Trend', v: data.sentiment.trend.toUpperCase(), c: data.sentiment.trend === 'rising' ? 'var(--green)' : data.sentiment.trend === 'falling' ? 'var(--red)' : 'var(--yellow)' },
                        { l: 'Overall Social Sentiment', v: `${((data.sentiment.overallSentiment + 1) / 2 * 100).toFixed(0)}/100`, c: data.sentiment.overallSentiment > 0 ? 'var(--green)' : 'var(--red)' },
                      ].map(item => (
                        <div key={item.l} style={{ padding: '0.42rem 0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, display: 'flex', justifyContent: 'space-between' }}>
                          <span className="section-label" style={{ fontSize: '0.56rem' }}>{item.l}</span>
                          <span className="mono" style={{ fontSize: '0.78rem', color: item.c }}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span className="section-label" style={{ fontSize: '0.56rem' }}>BULL/BEAR RATIO</span>
                        <span className="mono" style={{ fontSize: '0.68rem' }}>{((data.sentiment.overallSentiment + 1) / 2 * 100).toFixed(0)}% bullish</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(255,51,85,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${((data.sentiment.overallSentiment + 1) / 2 * 100)}%`, background: 'linear-gradient(90deg, var(--red), var(--green))', transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>LIVE MACRO CONTEXT</div>
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {[
                        { l: 'FED RATE', v: `${data.macro.fedFundsRate}%`, ctx: data.macro.rateEnvironment, c: 'var(--yellow)' },
                        { l: '10Y YIELD', v: '~4.27%', ctx: 'Oil shock elevated', c: 'var(--red)' },
                        { l: 'CPI YoY', v: `${data.macro.cpiYoy.toFixed(1)}%`, ctx: data.macro.inflationTrend, c: data.macro.cpiYoy > 3 ? 'var(--red)' : 'var(--yellow)' },
                        { l: 'RECESSION RISK', v: data.macro.recessionRisk, ctx: 'FRED signal', c: data.macro.recessionRisk === 'LOW' ? 'var(--green)' : 'var(--red)' },
                        { l: 'YIELD CURVE', v: data.macro.yieldCurveStatus, ctx: `${data.macro.yieldCurve10Y2Y.toFixed(2)}%`, c: data.macro.yieldCurveStatus === 'NORMAL' ? 'var(--green)' : 'var(--red)' },
                        { l: 'FEAR & GREED', v: `${data.sentiment.fearGreedIndex}`, ctx: data.sentiment.fearGreedLabel, c: data.sentiment.fearGreedIndex < 40 ? 'var(--green)' : data.sentiment.fearGreedIndex > 70 ? 'var(--red)' : 'var(--yellow)' },
                      ].map(item => (
                        <div key={item.l} style={{ padding: '0.42rem 0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                            <span className="section-label" style={{ fontSize: '0.56rem' }}>{item.l}</span>
                            <span className="mono" style={{ fontSize: '0.78rem', color: item.c }}>{item.v}</span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{item.ctx}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ══ NEWS / CATALYSTS ══ */}
              {activeTab === 'news' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div className="section-label" style={{ marginBottom: '0.65rem' }}>
                      <Flame size={11} style={{ display: 'inline', marginRight: '0.3rem' }} />
                      DETECTED CATALYSTS ({data.catalysts.length})
                    </div>
                    {data.catalysts.length === 0
                      ? <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No significant catalysts detected.</div>
                      : data.catalysts.map((cat: any, i: number) => (
                        <div key={i} style={{ padding: '0.65rem 0.75rem', marginBottom: '0.4rem', background: 'var(--surface)', border: `1px solid ${cat.direction === 'BULLISH' ? 'rgba(0,255,136,0.2)' : cat.direction === 'BEARISH' ? 'rgba(255,51,85,0.2)' : 'rgba(255,215,0,0.2)'}`, borderRadius: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <span style={{ padding: '0.1rem 0.35rem', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--font-display)', borderRadius: 2, background: cat.direction === 'BULLISH' ? 'rgba(0,255,136,0.15)' : cat.direction === 'BEARISH' ? 'rgba(255,51,85,0.15)' : 'rgba(255,215,0,0.15)', color: cat.direction === 'BULLISH' ? 'var(--green)' : cat.direction === 'BEARISH' ? 'var(--red)' : 'var(--yellow)' }}>{cat.direction}</span>
                              <span style={{ padding: '0.1rem 0.35rem', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--font-display)', borderRadius: 2, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}>{cat.impact}</span>
                              <span style={{ padding: '0.1rem 0.35rem', fontSize: '0.52rem', fontFamily: 'var(--font-display)', borderRadius: 2, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)', textTransform: 'uppercase' }}>{cat.type}</span>
                            </div>
                            <span className="section-label" style={{ fontSize: '0.52rem', flexShrink: 0 }}>{cat.timeframe}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.45 }}>{cat.description}</div>
                        </div>
                      ))}
                  </div>

                  <div>
                    <div className="section-label" style={{ marginBottom: '0.65rem' }}>RECENT NEWS</div>
                    {data.news.map((item: any, i: number) => (
                      <div key={i} style={{ padding: '0.65rem 0.75rem', marginBottom: '0.4rem', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${item.sentiment === 'positive' ? 'var(--green)' : item.sentiment === 'negative' ? 'var(--red)' : 'var(--yellow)'}`, borderRadius: '0 2px 2px 0', cursor: item.url !== '#' ? 'pointer' : 'default' }}
                        onClick={() => item.url !== '#' && window.open(item.url, '_blank')}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-bright)', lineHeight: 1.35, marginBottom: '0.3rem' }}>{item.headline}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="section-label" style={{ fontSize: '0.55rem' }}>{item.source}</span>
                          <span className="mono" style={{ fontSize: '0.62rem', color: item.sentiment === 'positive' ? 'var(--green)' : item.sentiment === 'negative' ? 'var(--red)' : 'var(--yellow)' }}>
                            {item.sentiment === 'positive' ? '▲ BULLISH' : item.sentiment === 'negative' ? '▼ BEARISH' : '● NEUTRAL'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {Object.entries(data.dataSources || {}).map(([k, v]: [string, any]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 4px var(--green)' }} />
                  <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>{v}</span>
                </div>
              ))}
            </div>
            <span className="section-label mono" style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>
              {new Date(data.timestamp).toLocaleTimeString()} · Not financial advice
            </span>
          </div>
        </div>
      )}

      {/* LANDING */}
      {!data && !loading && (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div className="display" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-bright)', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
            MARKET INTELLIGENCE
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--muted)', marginBottom: '2rem' }}>
            6-source data fusion · AI analysis · Day · Swing · Long · Options
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxWidth: '750px', margin: '0 auto 1.5rem' }}>
            {[
              { icon: <BarChart2 size={18} />, title: 'Technicals', desc: 'Twelve Data RSI/MACD/BB + Alpaca real-time bars', source: 'Twelve Data · Alpaca' },
              { icon: <Target size={18} />, title: 'Options', desc: 'Full chain, AI-recommended legs, Greeks, strikes', source: 'Finnhub' },
              { icon: <BookOpen size={18} />, title: 'Fundamentals', desc: 'DCF, analyst targets, insider activity, earnings', source: 'FMP' },
              { icon: <Building2 size={18} />, title: 'Macro / FRED', desc: 'Fed Funds, yield curve, CPI, unemployment, M2', source: 'FRED' },
              { icon: <MessageCircle size={18} />, title: 'Sentiment', desc: 'Reddit mentions, Fear & Greed, social trend', source: 'Reddit · CNN' },
              { icon: <Globe size={18} />, title: 'Catalysts', desc: 'Auto-detected technical, fundamental & macro triggers', source: 'All sources' },
            ].map(item => (
              <div key={item.title} className="apex-card" style={{ padding: '1.25rem', textAlign: 'left' }}>
                <div style={{ color: 'var(--accent)', marginBottom: '0.6rem' }}>{item.icon}</div>
                <div className="display" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.3rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '0.4rem' }}>{item.desc}</div>
                <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--accent)', opacity: 0.7 }}>{item.source}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Sub-components ----
function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const color = value <= 25 ? 'var(--red)' : value <= 45 ? '#ff8844' : value <= 55 ? 'var(--yellow)' : value <= 75 ? '#88ff44' : 'var(--green)'
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="160" height="92" viewBox="0 0 160 92">
        <path d="M 10 82 A 70 70 0 0 1 150 82" fill="none" stroke="var(--border)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 82 A 70 70 0 0 1 150 82" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(value / 100) * 220} 220`} />
        <text x="80" y="70" textAnchor="middle" fill={color} fontSize="28" fontFamily="Share Tech Mono" fontWeight="700">{value}</text>
      </svg>
      <div className="display" style={{ fontSize: '0.95rem', fontWeight: 700, color, letterSpacing: '0.04em', marginTop: '-0.4rem' }}>{label}</div>
    </div>
  )
}

// ---- Helpers ----
function sigColor(s: Signal): string {
  if (s === 'STRONG BUY') return 'glow-green stat-up'
  if (s === 'BUY') return 'stat-up'
  if (s === 'NEUTRAL') return 'glow-yellow stat-neutral'
  if (s === 'SELL') return 'stat-down'
  return 'glow-red stat-down'
}
function convBg(c: string) { return c === 'HIGH' ? 'rgba(0,255,136,0.1)' : c === 'MEDIUM' ? 'rgba(0,212,255,0.08)' : 'rgba(100,116,139,0.08)' }
function convBorder(c: string) { return c === 'HIGH' ? 'rgba(0,255,136,0.3)' : c === 'MEDIUM' ? 'rgba(0,212,255,0.2)' : 'rgba(100,116,139,0.18)' }
function convColor(c: string) { return c === 'HIGH' ? 'var(--green)' : c === 'MEDIUM' ? 'var(--accent)' : 'var(--muted)' }
function riskBg(r: string) { return r === 'LOW' ? 'rgba(0,255,136,0.1)' : r === 'MEDIUM' ? 'rgba(255,215,0,0.1)' : 'rgba(255,51,85,0.1)' }
function riskBorder(r: string) { return r === 'LOW' ? 'rgba(0,255,136,0.28)' : r === 'MEDIUM' ? 'rgba(255,215,0,0.28)' : 'rgba(255,51,85,0.28)' }
function riskColor(r: string) { return r === 'LOW' ? 'var(--green)' : r === 'MEDIUM' ? 'var(--yellow)' : 'var(--red)' }
function getConsensusColor(c: string) { return c?.includes('Buy') ? 'var(--green)' : c?.includes('Sell') ? 'var(--red)' : 'var(--yellow)' }
function rsiStatus(v: number): 'bull' | 'bear' | 'neutral' { return v < 35 ? 'bull' : v > 65 ? 'bear' : 'neutral' }
function rsiColor(v: number) { return v < 30 ? 'var(--green)' : v < 45 ? '#88ff99' : v < 55 ? 'var(--yellow)' : v < 70 ? '#ff8844' : 'var(--red)' }
function rsiLabel(v: number) { return v < 30 ? 'OVERSOLD' : v < 45 ? 'WEAK' : v < 55 ? 'NEUTRAL' : v < 70 ? 'STRONG' : 'OVERBOUGHT' }
function fmtVol(v?: number) { if (!v) return '—'; if (v >= 1e9) return `${(v/1e9).toFixed(1)}B`; if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v/1e3).toFixed(0)}K`; return `${v}` }
function fmtMktCap(v?: number) { if (!v) return '—'; if (v >= 1e12) return `$${(v/1e12).toFixed(2)}T`; if (v >= 1e9) return `$${(v/1e9).toFixed(1)}B`; return `$${(v/1e6).toFixed(0)}M` }
