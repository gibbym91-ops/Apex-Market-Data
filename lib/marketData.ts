// lib/marketData.ts
// Data layer: Alpaca · Twelve Data · Finnhub · FMP · Alpha Vantage · FRED
// Each source has a clearly defined role with graceful fallbacks to mock data.

// ============================================================
// INTERFACES
// ============================================================

export interface Quote {
  symbol: string
  name?: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  prevClose: number
  volume: number
  avgVolume?: number
  marketCap?: number
  pe?: number
  eps?: number
  week52High?: number
  week52Low?: number
  beta?: number
  sharesOutstanding?: number
  source: string // which API provided this
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TechnicalIndicators {
  // From Twelve Data (server-computed) or manual fallback
  rsi14: number
  macd: number
  macdSignal: number
  macdHist: number
  bbUpper: number
  bbMiddle: number
  bbLower: number
  bbWidth: number
  stochK: number
  stochD: number
  adx: number
  // Computed from candles
  sma20: number
  sma50: number
  sma200: number
  ema9: number
  ema21: number
  atr14: number
  vwap: number
  obv: number
  volumeRatio: number
  priceVsSma20: number
  priceVsSma50: number
  priceVsSma200: number
  source: string
}

export interface Fundamentals {
  // Valuation (FMP)
  pe: number
  pb: number
  ps: number
  evEbitda: number
  dcfValue: number
  dcfUpside: number         // % above(+) or below(-) DCF fair value
  // Analyst consensus (FMP)
  analystTargetHigh: number
  analystTargetLow: number
  analystTargetMean: number
  analystBuy: number
  analystHold: number
  analystSell: number
  analystConsensus: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' | 'N/A'
  // Financial health (FMP key-metrics)
  debtToEquity: number
  currentRatio: number
  freeCashFlowPerShare: number
  revenueGrowthYoy: number
  epsGrowthYoy: number
  grossMargin: number
  netMargin: number
  roe: number
  // Insider trading (FMP) — last 90 days
  insiderBuys: number
  insiderSells: number
  insiderNetShares: number
  insiderSentiment: 'BUYING' | 'SELLING' | 'NEUTRAL'
  // Earnings (FMP)
  nextEarningsDate: string
  daysToEarnings: number
  lastEpsActual: number
  lastEpsEstimate: number
  lastEpsSurprise: number   // percent
  // Institutional
  institutionalOwnership: number
}

export interface MacroData {
  // From FRED
  fedFundsRate: number
  fedFundsRatePrev: number
  yieldCurve10Y2Y: number   // positive = normal, negative = inverted
  yieldCurve10Y3M: number
  cpiYoy: number
  corePceYoy: number
  unemploymentRate: number
  m2Growth: number
  gdpGrowth: number
  // Derived signals
  recessionRisk: 'LOW' | 'ELEVATED' | 'HIGH'
  rateEnvironment: 'CUTTING' | 'HOLDING' | 'HIKING'
  inflationTrend: 'COOLING' | 'STABLE' | 'RISING'
  yieldCurveStatus: 'NORMAL' | 'FLAT' | 'INVERTED'
  macroScore: number        // -3 to +3 for equities
}

export interface OptionsChain {
  calls: OptionContract[]
  puts: OptionContract[]
  expirations: string[]
}

export interface OptionContract {
  strike: number
  expiration: string
  bid: number
  ask: number
  last: number
  volume: number
  openInterest: number
  impliedVolatility: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
  type: 'call' | 'put'
  inTheMoney: boolean
}

export interface NewsItem {
  headline: string
  summary: string
  source: string
  datetime: number
  url: string
  sentiment: 'positive' | 'negative' | 'neutral'
  sentimentScore: number
}

export interface SocialSentiment {
  redditMentions: number
  redditSentimentScore: number
  twitterVolume: number
  twitterSentiment: number
  overallSentiment: number
  trend: 'rising' | 'falling' | 'stable'
  fearGreedIndex: number
  fearGreedLabel: string
}

// ============================================================
// HELPER — fetch with timeout
// ============================================================
async function fetchWithTimeout(url: string, options: RequestInit & { next?: any } = {}, ms = 8000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

function hasKey(key: string | undefined): boolean {
  return !!key && !key.startsWith('your_')
}

// ============================================================
// QUOTE — Priority: Alpaca → FMP → Finnhub → mock
// ============================================================
export async function getQuote(symbol: string): Promise<Quote> {
  const sym = symbol.toUpperCase()

  // 1. Try Alpaca (most real-time)
  if (hasKey(process.env.ALPACA_API_KEY)) {
    try {
      const [tradeRes, barRes] = await Promise.all([
        fetchWithTimeout(
          `${process.env.ALPACA_DATA_URL}/v2/stocks/${sym}/trades/latest`,
          { headers: { 'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!, 'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET! }, next: { revalidate: 15 } }
        ),
        fetchWithTimeout(
          `${process.env.ALPACA_DATA_URL}/v2/stocks/${sym}/bars/latest`,
          { headers: { 'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!, 'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET! }, next: { revalidate: 15 } }
        ),
      ])
      if (tradeRes.ok && barRes.ok) {
        const trade = await tradeRes.json()
        const bar = await barRes.json()
        const price = trade?.trade?.p || bar?.bar?.c
        if (price) {
          const b = bar?.bar || {}
          const prevClose = b.c ? b.c : price * 0.99
          // Enrich with FMP profile data if available
          const profile = await getFmpProfile(sym)
          return {
            symbol: sym,
            name: profile?.companyName || sym,
            price,
            change: price - (b.o || price),
            changePercent: b.o ? ((price - b.o) / b.o) * 100 : 0,
            open: b.o || price,
            high: b.h || price,
            low: b.l || price,
            prevClose: b.o || price,
            volume: b.v || 0,
            avgVolume: profile?.volAvg,
            marketCap: profile?.mktCap,
            pe: profile?.pe,
            eps: profile?.eps,
            week52High: profile?.range ? parseFloat(profile.range.split('-')[1]) : undefined,
            week52Low: profile?.range ? parseFloat(profile.range.split('-')[0]) : undefined,
            beta: profile?.beta,
            sharesOutstanding: profile?.sharesOutstanding,
            source: 'Alpaca + FMP',
          }
        }
      }
    } catch (e) { /* fallthrough */ }
  }

  // 2. Try FMP
  if (hasKey(process.env.FMP_API_KEY)) {
    try {
      const res = await fetchWithTimeout(
        `https://financialmodelingprep.com/api/v3/quote/${sym}?apikey=${process.env.FMP_API_KEY}`,
        { next: { revalidate: 30 } }
      )
      if (res.ok) {
        const data = await res.json()
        const q = data?.[0]
        if (q?.price) {
          return {
            symbol: sym,
            name: q.name,
            price: q.price,
            change: q.change || 0,
            changePercent: q.changesPercentage || 0,
            open: q.open || q.price,
            high: q.dayHigh || q.price,
            low: q.dayLow || q.price,
            prevClose: q.previousClose || q.price,
            volume: q.volume || 0,
            avgVolume: q.avgVolume,
            marketCap: q.marketCap,
            pe: q.pe,
            eps: q.eps,
            week52High: q.yearHigh,
            week52Low: q.yearLow,
            sharesOutstanding: q.sharesOutstanding,
            source: 'FMP',
          }
        }
      }
    } catch (e) { /* fallthrough */ }
  }

  // 3. Try Finnhub
  if (hasKey(process.env.FINNHUB_API_KEY)) {
    try {
      const [qRes, pRes] = await Promise.all([
        fetchWithTimeout(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${process.env.FINNHUB_API_KEY}`, { next: { revalidate: 30 } }),
        fetchWithTimeout(`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${process.env.FINNHUB_API_KEY}`, { next: { revalidate: 3600 } }),
      ])
      if (qRes.ok) {
        const q = await qRes.json()
        const p = pRes.ok ? await pRes.json() : {}
        if (q?.c) {
          return {
            symbol: sym, name: p.name || sym,
            price: q.c, change: q.d || 0, changePercent: q.dp || 0,
            open: q.o, high: q.h, low: q.l, prevClose: q.pc,
            volume: q.v || 0, beta: p.beta,
            marketCap: p.marketCapitalization ? p.marketCapitalization * 1e6 : undefined,
            source: 'Finnhub',
          }
        }
      }
    } catch (e) { /* fallthrough */ }
  }

  // 4. Mock
  return getMockQuote(sym)
}

// ============================================================
// FMP PROFILE (helper, used inside getQuote)
// ============================================================
async function getFmpProfile(symbol: string): Promise<any> {
  if (!hasKey(process.env.FMP_API_KEY)) return null
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.[0] || null
  } catch { return null }
}

// ============================================================
// CANDLES — Priority: Alpaca (intraday) → Twelve Data (daily) → Alpha Vantage → mock
// ============================================================
export async function getCandles(symbol: string, mode: 'day' | 'swing' | 'long'): Promise<Candle[]> {
  const sym = symbol.toUpperCase()

  if (mode === 'day') {
    // Alpaca intraday bars (5-minute, last trading day)
    if (hasKey(process.env.ALPACA_API_KEY)) {
      try {
        const end = new Date().toISOString()
        const start = new Date(Date.now() - 2 * 86400000).toISOString()
        const res = await fetchWithTimeout(
          `${process.env.ALPACA_DATA_URL}/v2/stocks/${sym}/bars?timeframe=5Min&start=${start}&end=${end}&limit=100&adjustment=raw`,
          {
            headers: { 'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!, 'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET! },
            next: { revalidate: 60 }
          }
        )
        if (res.ok) {
          const data = await res.json()
          const bars = data?.bars || []
          if (bars.length > 5) {
            return bars.map((b: any) => ({
              time: new Date(b.t).getTime(),
              open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v,
            }))
          }
        }
      } catch (e) { /* fallthrough */ }
    }
    // Twelve Data 5-min fallback
    return getTwelveDataCandles(sym, '5min', 80)
  }

  // Swing / Long: daily bars
  // Priority: Twelve Data → Alpha Vantage → Alpaca daily → mock
  const tdCandles = await getTwelveDataCandles(sym, '1day', mode === 'long' ? 300 : 90)
  if (tdCandles.length > 20) return tdCandles

  // Alpha Vantage daily fallback
  if (hasKey(process.env.ALPHA_VANTAGE_KEY)) {
    try {
      const res = await fetchWithTimeout(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${sym}&outputsize=compact&apikey=${process.env.ALPHA_VANTAGE_KEY}`,
        { next: { revalidate: 600 } }
      )
      if (res.ok) {
        const data = await res.json()
        const series = data['Time Series (Daily)']
        if (series) {
          return Object.entries(series)
            .slice(0, mode === 'long' ? 250 : 90)
            .map(([date, v]: [string, any]) => ({
              time: new Date(date).getTime(),
              open: parseFloat(v['1. open']),
              high: parseFloat(v['2. high']),
              low: parseFloat(v['3. low']),
              close: parseFloat(v['4. close']),
              volume: parseFloat(v['5. volume']),
            }))
            .reverse()
        }
      }
    } catch (e) { /* fallthrough */ }
  }

  // Alpaca daily bars fallback
  if (hasKey(process.env.ALPACA_API_KEY)) {
    try {
      const end = new Date().toISOString()
      const start = new Date(Date.now() - (mode === 'long' ? 365 : 90) * 86400000).toISOString()
      const res = await fetchWithTimeout(
        `${process.env.ALPACA_DATA_URL}/v2/stocks/${sym}/bars?timeframe=1Day&start=${start}&end=${end}&limit=300&adjustment=all`,
        {
          headers: { 'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!, 'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET! },
          next: { revalidate: 300 }
        }
      )
      if (res.ok) {
        const data = await res.json()
        const bars = data?.bars || []
        if (bars.length > 10) {
          return bars.map((b: any) => ({
            time: new Date(b.t).getTime(),
            open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v,
          }))
        }
      }
    } catch (e) { /* fallthrough */ }
  }

  return getMockCandles(sym)
}

async function getTwelveDataCandles(symbol: string, interval: string, outputsize: number): Promise<Candle[]> {
  if (!hasKey(process.env.TWELVE_DATA_KEY)) return []
  try {
    const res = await fetchWithTimeout(
      `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${process.env.TWELVE_DATA_KEY}`,
      { next: { revalidate: interval === '1day' ? 300 : 60 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (data.status === 'error' || !data.values) return []
    return data.values
      .map((v: any) => ({
        time: new Date(v.datetime).getTime(),
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseFloat(v.volume || '0'),
      }))
      .reverse()
  } catch { return [] }
}

// ============================================================
// TECHNICAL INDICATORS — Priority: Twelve Data → computed from candles
// ============================================================
export async function getTechnicals(symbol: string, candles: Candle[], price: number): Promise<TechnicalIndicators> {
  const sym = symbol.toUpperCase()
  const interval = '1day'

  if (hasKey(process.env.TWELVE_DATA_KEY)) {
    try {
      // Batch-fetch all indicators in parallel
      const [rsiRes, macdRes, bbRes, stochRes, adxRes] = await Promise.allSettled([
        fetchWithTimeout(`https://api.twelvedata.com/rsi?symbol=${sym}&interval=${interval}&time_period=14&apikey=${process.env.TWELVE_DATA_KEY}`, { next: { revalidate: 300 } }),
        fetchWithTimeout(`https://api.twelvedata.com/macd?symbol=${sym}&interval=${interval}&apikey=${process.env.TWELVE_DATA_KEY}`, { next: { revalidate: 300 } }),
        fetchWithTimeout(`https://api.twelvedata.com/bbands?symbol=${sym}&interval=${interval}&time_period=20&apikey=${process.env.TWELVE_DATA_KEY}`, { next: { revalidate: 300 } }),
        fetchWithTimeout(`https://api.twelvedata.com/stoch?symbol=${sym}&interval=${interval}&apikey=${process.env.TWELVE_DATA_KEY}`, { next: { revalidate: 300 } }),
        fetchWithTimeout(`https://api.twelvedata.com/adx?symbol=${sym}&interval=${interval}&time_period=14&apikey=${process.env.TWELVE_DATA_KEY}`, { next: { revalidate: 300 } }),
      ])

      const parse = async (r: PromiseSettledResult<Response>) => {
        if (r.status !== 'fulfilled' || !r.value.ok) return null
        const d = await r.value.json()
        return d.status === 'error' ? null : d
      }

      const [rsiData, macdData, bbData, stochData, adxData] = await Promise.all([
        parse(rsiRes), parse(macdRes), parse(bbRes), parse(stochRes), parse(adxRes),
      ])

      const rsiVal = rsiData?.values?.[0]?.rsi
      const macdVal = macdData?.values?.[0]
      const bbVal = bbData?.values?.[0]
      const stochVal = stochData?.values?.[0]
      const adxVal = adxData?.values?.[0]?.adx

      if (rsiVal && macdVal && bbVal) {
        const computed = computeFromCandles(candles, price)
        return {
          rsi14: parseFloat(rsiVal),
          macd: parseFloat(macdVal.macd),
          macdSignal: parseFloat(macdVal.macd_signal),
          macdHist: parseFloat(macdVal.macd_hist),
          bbUpper: parseFloat(bbVal.upper_band),
          bbMiddle: parseFloat(bbVal.middle_band),
          bbLower: parseFloat(bbVal.lower_band),
          bbWidth: bbVal.upper_band && bbVal.lower_band && bbVal.middle_band
            ? (parseFloat(bbVal.upper_band) - parseFloat(bbVal.lower_band)) / parseFloat(bbVal.middle_band)
            : computed.bbWidth,
          stochK: stochVal ? parseFloat(stochVal.slow_k || stochVal.k) : computed.stochK,
          stochD: stochVal ? parseFloat(stochVal.slow_d || stochVal.d) : computed.stochD,
          adx: adxVal ? parseFloat(adxVal) : computed.adx,
          // Computed from candle data
          ...computed,
          source: 'Twelve Data + computed',
        }
      }
    } catch (e) { /* fallthrough */ }
  }

  // Full local computation fallback
  const computed = computeFromCandles(candles, price)
  return { ...computed, source: 'Computed' }
}

function computeFromCandles(candles: Candle[], currentPrice: number): TechnicalIndicators {
  if (candles.length < 20) return getMockTechnicals(currentPrice)

  const closes = candles.map(c => c.close)
  const highs = candles.map(c => c.high)
  const lows = candles.map(c => c.low)
  const volumes = candles.map(c => c.volume)
  const n = closes.length

  const sma = (arr: number[], period: number): number => {
    const slice = arr.slice(-period)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  }
  const emaArr = (arr: number[], period: number): number[] => {
    const k = 2 / (period + 1)
    const result = [arr[0]]
    for (let i = 1; i < arr.length; i++) result.push(arr[i] * k + result[i - 1] * (1 - k))
    return result
  }

  const sma20 = sma(closes, Math.min(20, n))
  const sma50 = sma(closes, Math.min(50, n))
  const sma200 = sma(closes, Math.min(200, n))
  const ema9arr = emaArr(closes, 9)
  const ema21arr = emaArr(closes, 21)
  const ema12arr = emaArr(closes, 12)
  const ema26arr = emaArr(closes, 26)
  const ema9 = ema9arr[ema9arr.length - 1]
  const ema21 = ema21arr[ema21arr.length - 1]
  const macdLine = ema12arr.map((v, i) => v - ema26arr[i])
  const macdSignalArr = emaArr(macdLine, 9)
  const macd = macdLine[macdLine.length - 1]
  const macdSignal = macdSignalArr[macdSignalArr.length - 1]
  const macdHist = macd - macdSignal

  // RSI
  const gains: number[] = [], losses: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    gains.push(d > 0 ? d : 0); losses.push(d < 0 ? -d : 0)
  }
  const p = 14
  const ag = gains.slice(-p).reduce((a, b) => a + b, 0) / p
  const al = losses.slice(-p).reduce((a, b) => a + b, 0) / p
  const rsi14 = al === 0 ? 100 : 100 - 100 / (1 + ag / al)

  // Bollinger
  const variance = closes.slice(-20).reduce((sum, c) => sum + Math.pow(c - sma20, 2), 0) / 20
  const std = Math.sqrt(variance)
  const bbUpper = sma20 + 2 * std
  const bbLower = sma20 - 2 * std
  const bbWidth = (bbUpper - bbLower) / sma20

  // ATR
  const trueRanges = candles.slice(-15).map((c, i) => {
    if (i === 0) return c.high - c.low
    const prev = candles[candles.length - 15 + i - 1]
    return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close))
  })
  const atr14 = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length

  // VWAP
  const vwapSlice = candles.slice(-20)
  const totalTP = vwapSlice.reduce((s, c) => s + ((c.high + c.low + c.close) / 3) * c.volume, 0)
  const totalVol = vwapSlice.reduce((s, c) => s + c.volume, 0)
  const vwap = totalVol > 0 ? totalTP / totalVol : currentPrice

  // OBV
  let obv = 0
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) obv += candles[i].volume
    else if (candles[i].close < candles[i - 1].close) obv -= candles[i].volume
  }

  // Stochastic
  const recentHighs = highs.slice(-14)
  const recentLows = lows.slice(-14)
  const hh = Math.max(...recentHighs), ll = Math.min(...recentLows)
  const stochK = hh !== ll ? ((currentPrice - ll) / (hh - ll)) * 100 : 50
  const stochD = stochK // simplified; Twelve Data provides proper %D

  // ADX approximation
  const adx = Math.min(70, Math.abs(rsi14 - 50) * 1.4 + 18)

  // Volume ratio
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const volumeRatio = avgVol > 0 ? volumes[volumes.length - 1] / avgVol : 1

  return {
    rsi14, macd, macdSignal, macdHist,
    bbUpper, bbMiddle: sma20, bbLower, bbWidth,
    stochK, stochD, adx,
    sma20, sma50, sma200, ema9, ema21,
    atr14, vwap, obv,
    volumeRatio,
    priceVsSma20: ((currentPrice - sma20) / sma20) * 100,
    priceVsSma50: ((currentPrice - sma50) / sma50) * 100,
    priceVsSma200: ((currentPrice - sma200) / sma200) * 100,
    source: 'Computed',
  }
}

// ============================================================
// FUNDAMENTALS — FMP (DCF, analyst targets, insider, earnings)
// ============================================================
export async function getFundamentals(symbol: string, price: number): Promise<Fundamentals> {
  if (!hasKey(process.env.FMP_API_KEY)) return getMockFundamentals(symbol, price)

  const sym = symbol.toUpperCase()
  const key = process.env.FMP_API_KEY

  try {
    const [dcfRes, targetRes, gradeRes, metricsRes, growthRes, insiderRes, earningsRes] = await Promise.allSettled([
      fetchWithTimeout(`https://financialmodelingprep.com/api/v3/discounted-cash-flow/${sym}?apikey=${key}`, { next: { revalidate: 3600 } }),
      fetchWithTimeout(`https://financialmodelingprep.com/api/v3/price-target-consensus/${sym}?apikey=${key}`, { next: { revalidate: 3600 } }),
      fetchWithTimeout(`https://financialmodelingprep.com/api/v3/grade/${sym}?limit=10&apikey=${key}`, { next: { revalidate: 3600 } }),
      fetchWithTimeout(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${sym}?apikey=${key}`, { next: { revalidate: 3600 } }),
      fetchWithTimeout(`https://financialmodelingprep.com/api/v3/financial-growth/${sym}?limit=1&apikey=${key}`, { next: { revalidate: 3600 } }),
      fetchWithTimeout(`https://financialmodelingprep.com/api/v3/insider-trading?symbol=${sym}&limit=50&apikey=${key}`, { next: { revalidate: 3600 } }),
      fetchWithTimeout(`https://financialmodelingprep.com/api/v3/earnings-surprises/${sym}?apikey=${key}`, { next: { revalidate: 3600 } }),
    ])

    const json = async (r: PromiseSettledResult<Response>) => {
      if (r.status !== 'fulfilled' || !r.value.ok) return null
      try { return await r.value.json() } catch { return null }
    }

    const [dcfData, targetData, gradeData, metricsData, growthData, insiderData, earningsData] = await Promise.all([
      json(dcfRes), json(targetRes), json(gradeRes), json(metricsRes),
      json(growthRes), json(insiderRes), json(earningsRes),
    ])

    // DCF
    const dcf = Array.isArray(dcfData) ? dcfData[0] : dcfData
    const dcfValue = dcf?.dcf || price
    const dcfUpside = ((dcfValue - price) / price) * 100

    // Price targets
    const target = Array.isArray(targetData) ? targetData[0] : targetData
    const analystTargetMean = target?.targetConsensus || price * 1.05
    const analystTargetHigh = target?.targetHigh || price * 1.15
    const analystTargetLow = target?.targetLow || price * 0.90

    // Analyst grades → consensus
    const grades = Array.isArray(gradeData) ? gradeData.slice(0, 10) : []
    let buys = 0, holds = 0, sells = 0
    grades.forEach((g: any) => {
      const grade = (g.newGrade || '').toLowerCase()
      if (['strong buy', 'buy', 'outperform', 'overweight', 'positive', 'accumulate'].some(k => grade.includes(k))) buys++
      else if (['strong sell', 'sell', 'underperform', 'underweight', 'reduce'].some(k => grade.includes(k))) sells++
      else holds++
    })
    const total = buys + holds + sells || 1
    const bullPct = buys / total
    const bearPct = sells / total
    const consensus = bullPct > 0.6 ? 'Strong Buy' : bullPct > 0.4 ? 'Buy' : bearPct > 0.6 ? 'Strong Sell' : bearPct > 0.4 ? 'Sell' : 'Hold'

    // Key metrics TTM
    const m = Array.isArray(metricsData) ? metricsData[0] : {}
    // Growth
    const g = Array.isArray(growthData) ? growthData[0] : {}

    // Insider trading
    const trades = Array.isArray(insiderData) ? insiderData : []
    let insiderBuys = 0, insiderSells = 0, insiderNetShares = 0
    trades.forEach((t: any) => {
      const shares = Math.abs(t.securitiesTransacted || 0)
      if ((t.transactionType || '').toLowerCase().includes('purchase') || (t.acquistionOrDisposition || '').toLowerCase() === 'a') {
        insiderBuys++; insiderNetShares += shares
      } else {
        insiderSells++; insiderNetShares -= shares
      }
    })
    const insiderSentiment: Fundamentals['insiderSentiment'] =
      insiderBuys > insiderSells * 1.5 ? 'BUYING' :
        insiderSells > insiderBuys * 1.5 ? 'SELLING' : 'NEUTRAL'

    // Earnings
    const earnings = Array.isArray(earningsData) ? earningsData : []
    const lastEarning = earnings[0] || {}
    const lastEpsActual = lastEarning.actualEarningResult || 0
    const lastEpsEstimate = lastEarning.estimatedEarning || 0
    const lastEpsSurprise = lastEpsEstimate ? ((lastEpsActual - lastEpsEstimate) / Math.abs(lastEpsEstimate)) * 100 : 0

    // Next earnings — try earnings calendar
    let nextEarningsDate = 'Unknown'
    let daysToEarnings = 999
    try {
      const today = new Date().toISOString().split('T')[0]
      const future = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
      const ecRes = await fetchWithTimeout(
        `https://financialmodelingprep.com/api/v3/earnings-calendar?from=${today}&to=${future}&apikey=${key}`,
        { next: { revalidate: 3600 } }
      )
      if (ecRes.ok) {
        const ecData = await ecRes.json()
        const symEarning = (Array.isArray(ecData) ? ecData : []).find((e: any) => e.symbol === sym)
        if (symEarning?.date) {
          nextEarningsDate = symEarning.date
          daysToEarnings = Math.round((new Date(symEarning.date).getTime() - Date.now()) / 86400000)
        }
      }
    } catch { /* ignore */ }

    return {
      pe: m.peRatioTTM || 0,
      pb: m.pbRatioTTM || 0,
      ps: m.priceToSalesRatioTTM || 0,
      evEbitda: m.enterpriseValueOverEBITDATTM || 0,
      dcfValue: +dcfValue.toFixed(2),
      dcfUpside: +dcfUpside.toFixed(1),
      analystTargetHigh: +analystTargetHigh.toFixed(2),
      analystTargetLow: +analystTargetLow.toFixed(2),
      analystTargetMean: +analystTargetMean.toFixed(2),
      analystBuy: buys,
      analystHold: holds,
      analystSell: sells,
      analystConsensus: consensus as Fundamentals['analystConsensus'],
      debtToEquity: m.debtToEquityTTM || 0,
      currentRatio: m.currentRatioTTM || 0,
      freeCashFlowPerShare: m.freeCashFlowPerShareTTM || 0,
      revenueGrowthYoy: (g.revenueGrowth || 0) * 100,
      epsGrowthYoy: (g.epsgrowth || 0) * 100,
      grossMargin: (m.grossProfitMarginTTM || 0) * 100,
      netMargin: (m.netProfitMarginTTM || 0) * 100,
      roe: (m.roeTTM || 0) * 100,
      insiderBuys,
      insiderSells,
      insiderNetShares,
      insiderSentiment,
      nextEarningsDate,
      daysToEarnings,
      lastEpsActual,
      lastEpsEstimate,
      lastEpsSurprise: +lastEpsSurprise.toFixed(1),
      institutionalOwnership: (m.institutionalOwnershipPercentage || 0) * 100,
    }
  } catch (e) {
    console.error('FMP fundamentals error:', e)
    return getMockFundamentals(symbol, price)
  }
}

// ============================================================
// MACRO — FRED (Fed Funds, Yield Curve, CPI, Unemployment, M2, GDP)
// ============================================================
export async function getMacroData(): Promise<MacroData> {
  if (!hasKey(process.env.FRED_API_KEY)) return getMockMacro()

  const key = process.env.FRED_API_KEY
  const fredFetch = async (seriesId: string, limit = 2) => {
    try {
      const res = await fetchWithTimeout(
        `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&limit=${limit}&sort_order=desc`,
        { next: { revalidate: 3600 } }
      )
      if (!res.ok) return []
      const data = await res.json()
      return data?.observations || []
    } catch { return [] }
  }

  const [
    fedFundsObs,
    t10y2yObs,
    t10y3mObs,
    cpiObs,
    pceObs,
    unrateObs,
    m2Obs,
    gdpObs,
  ] = await Promise.all([
    fredFetch('FEDFUNDS', 2),
    fredFetch('T10Y2Y', 2),
    fredFetch('T10Y3M', 2),
    fredFetch('CPIAUCSL', 13),   // 13 months for YoY
    fredFetch('PCEPI', 13),
    fredFetch('UNRATE', 2),
    fredFetch('M2SL', 13),
    fredFetch('GDPC1', 2),
  ])

  const latest = (obs: any[]) => obs.find(o => o.value !== '.')?.value
  const parseNum = (v: any) => v ? parseFloat(v) : 0

  const fedFundsRate = parseNum(latest(fedFundsObs))
  const fedFundsPrev = parseNum(fedFundsObs[1]?.value)
  const yieldCurve10Y2Y = parseNum(latest(t10y2yObs))
  const yieldCurve10Y3M = parseNum(latest(t10y3mObs))
  const unemploymentRate = parseNum(latest(unrateObs))

  // CPI YoY
  const cpiNow = parseNum(latest(cpiObs))
  const cpiYearAgo = parseNum(cpiObs.slice(-1)[0]?.value)
  const cpiYoy = cpiYearAgo > 0 ? ((cpiNow - cpiYearAgo) / cpiYearAgo) * 100 : 0

  // Core PCE YoY
  const pceNow = parseNum(latest(pceObs))
  const pceYearAgo = parseNum(pceObs.slice(-1)[0]?.value)
  const corePceYoy = pceYearAgo > 0 ? ((pceNow - pceYearAgo) / pceYearAgo) * 100 : 0

  // M2 YoY
  const m2Now = parseNum(latest(m2Obs))
  const m2YearAgo = parseNum(m2Obs.slice(-1)[0]?.value)
  const m2Growth = m2YearAgo > 0 ? ((m2Now - m2YearAgo) / m2YearAgo) * 100 : 0

  // GDP growth (QoQ annualized)
  const gdpNow = parseNum(latest(gdpObs))
  const gdpPrev = parseNum(gdpObs[1]?.value)
  const gdpGrowth = gdpPrev > 0 ? ((gdpNow - gdpPrev) / gdpPrev) * 4 * 100 : 0

  // Derived signals
  const yieldCurveStatus: MacroData['yieldCurveStatus'] =
    yieldCurve10Y2Y <= -0.5 ? 'INVERTED' :
      yieldCurve10Y2Y <= 0.1 ? 'FLAT' : 'NORMAL'

  const rateEnvironment: MacroData['rateEnvironment'] =
    fedFundsRate < fedFundsPrev ? 'CUTTING' :
      fedFundsRate > fedFundsPrev ? 'HIKING' : 'HOLDING'

  const inflationTrend: MacroData['inflationTrend'] =
    cpiYoy > 4 ? 'RISING' : cpiYoy < 2.5 ? 'COOLING' : 'STABLE'

  const recessionRisk: MacroData['recessionRisk'] =
    (yieldCurve10Y2Y < -0.5 && unemploymentRate > 5) ? 'HIGH' :
      (yieldCurve10Y2Y < 0 || unemploymentRate > 4.5) ? 'ELEVATED' : 'LOW'

  // Macro score for equities (-3 = very bearish, +3 = very bullish)
  let macroScore = 0
  if (rateEnvironment === 'CUTTING') macroScore += 1
  else if (rateEnvironment === 'HIKING') macroScore -= 1
  if (inflationTrend === 'COOLING') macroScore += 1
  else if (inflationTrend === 'RISING') macroScore -= 1
  if (yieldCurveStatus === 'NORMAL') macroScore += 0.5
  else if (yieldCurveStatus === 'INVERTED') macroScore -= 1
  if (recessionRisk === 'LOW') macroScore += 0.5
  else if (recessionRisk === 'HIGH') macroScore -= 1
  if (gdpGrowth > 2) macroScore += 0.5
  else if (gdpGrowth < 0) macroScore -= 1

  return {
    fedFundsRate, fedFundsRatePrev: fedFundsPrev,
    yieldCurve10Y2Y, yieldCurve10Y3M,
    cpiYoy, corePceYoy, unemploymentRate,
    m2Growth, gdpGrowth,
    recessionRisk, rateEnvironment, inflationTrend, yieldCurveStatus,
    macroScore: Math.max(-3, Math.min(3, macroScore)),
  }
}

// ============================================================
// OPTIONS CHAIN — Finnhub (best free options data)
// ============================================================
export async function getOptionsChain(symbol: string, price: number): Promise<OptionsChain> {
  if (!hasKey(process.env.FINNHUB_API_KEY)) return getMockOptionsChain(symbol, price)

  try {
    const res = await fetchWithTimeout(
      `https://finnhub.io/api/v1/stock/option-chain?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return getMockOptionsChain(symbol, price)
    const data = await res.json()
    if (!data?.data?.length) return getMockOptionsChain(symbol, price)

    const calls: OptionContract[] = []
    const puts: OptionContract[] = []
    const expirations = new Set<string>()

    data.data.slice(0, 3).forEach((expGroup: any) => {
      const exp = expGroup.expirationDate
      expirations.add(exp)
      expGroup.options?.CALL?.slice(0, 10).forEach((c: any) => {
        calls.push({ strike: c.strike, expiration: exp, bid: c.bid, ask: c.ask, last: c.lastPrice, volume: c.volume || 0, openInterest: c.openInterest || 0, impliedVolatility: c.impliedVolatility || 0, delta: c.delta, gamma: c.gamma, theta: c.theta, vega: c.vega, type: 'call', inTheMoney: c.strike < price })
      })
      expGroup.options?.PUT?.slice(0, 10).forEach((p: any) => {
        puts.push({ strike: p.strike, expiration: exp, bid: p.bid, ask: p.ask, last: p.lastPrice, volume: p.volume || 0, openInterest: p.openInterest || 0, impliedVolatility: p.impliedVolatility || 0, delta: p.delta, gamma: p.gamma, theta: p.theta, vega: p.vega, type: 'put', inTheMoney: p.strike > price })
      })
    })
    return { calls, puts, expirations: Array.from(expirations) }
  } catch {
    return getMockOptionsChain(symbol, price)
  }
}

// ============================================================
// NEWS — Priority: Alpaca → Finnhub → mock
// ============================================================
export async function getNews(symbol: string): Promise<NewsItem[]> {
  // Try Alpaca news first (usually very fresh)
  if (hasKey(process.env.ALPACA_API_KEY)) {
    try {
      const start = new Date(Date.now() - 7 * 86400000).toISOString()
      const res = await fetchWithTimeout(
        `${process.env.ALPACA_DATA_URL}/v1beta1/news?symbols=${symbol}&start=${start}&limit=8&sort=desc`,
        {
          headers: { 'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!, 'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET! },
          next: { revalidate: 600 }
        }
      )
      if (res.ok) {
        const data = await res.json()
        const articles = data?.news || []
        if (articles.length > 0) {
          return articles.map((a: any) => ({
            headline: a.headline,
            summary: a.summary || '',
            source: a.source || 'Alpaca News',
            datetime: new Date(a.created_at).getTime() / 1000,
            url: a.url || '#',
            sentiment: scoreSentiment(a.headline + ' ' + (a.summary || '')),
            sentimentScore: getSentimentScore(a.headline + ' ' + (a.summary || '')),
          }))
        }
      }
    } catch (e) { /* fallthrough */ }
  }

  // Finnhub fallback
  if (hasKey(process.env.FINNHUB_API_KEY)) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const res = await fetchWithTimeout(
        `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgo}&to=${today}&token=${process.env.FINNHUB_API_KEY}`,
        { next: { revalidate: 900 } }
      )
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          return data.slice(0, 8).map((item: any) => ({
            headline: item.headline,
            summary: item.summary || '',
            source: item.source,
            datetime: item.datetime,
            url: item.url || '#',
            sentiment: scoreSentiment(item.headline + ' ' + item.summary),
            sentimentScore: getSentimentScore(item.headline + ' ' + item.summary),
          }))
        }
      }
    } catch (e) { /* fallthrough */ }
  }

  return getMockNews(symbol)
}

// ============================================================
// SOCIAL SENTIMENT — Reddit public JSON + Fear & Greed
// ============================================================
export async function getSocialSentiment(symbol: string): Promise<SocialSentiment> {
  try {
    const [redditData, fearGreed] = await Promise.allSettled([
      fetchRedditMentions(symbol),
      fetchFearGreedIndex(),
    ])
    const reddit = redditData.status === 'fulfilled' ? redditData.value : { mentions: 0, sentiment: 0 }
    const fg = fearGreed.status === 'fulfilled' ? fearGreed.value : { value: 50, label: 'Neutral' }

    return {
      redditMentions: reddit.mentions,
      redditSentimentScore: reddit.sentiment,
      twitterVolume: Math.floor(reddit.mentions * 3.2),
      twitterSentiment: reddit.sentiment * 0.9,
      overallSentiment: (reddit.sentiment + (fg.value / 100 - 0.5) * 2) / 2,
      trend: reddit.mentions > 60 ? 'rising' : reddit.mentions > 25 ? 'stable' : 'falling',
      fearGreedIndex: fg.value,
      fearGreedLabel: fg.label,
    }
  } catch {
    return getMockSentiment()
  }
}

async function fetchRedditMentions(symbol: string): Promise<{ mentions: number; sentiment: number }> {
  try {
    const subreddits = ['wallstreetbets', 'stocks', 'investing', 'options']
    let totalMentions = 0
    let sentimentSum = 0
    for (const sub of subreddits.slice(0, 2)) { // limit to 2 to stay fast
      try {
        const res = await fetchWithTimeout(
          `https://www.reddit.com/r/${sub}/search.json?q=${symbol}&limit=25&sort=new&t=day`,
          { headers: { 'User-Agent': 'ApexTrader/1.0' }, next: { revalidate: 300 } }
        )
        if (!res.ok) continue
        const data = await res.json()
        const posts = data?.data?.children || []
        totalMentions += posts.length
        posts.forEach((p: any) => { sentimentSum += getSentimentScore((p.data?.title || '') + ' ' + (p.data?.selftext || '')) })
      } catch { /* skip */ }
    }
    return { mentions: totalMentions, sentiment: totalMentions > 0 ? sentimentSum / totalMentions : 0 }
  } catch { return { mentions: 0, sentiment: 0 } }
}

async function fetchFearGreedIndex(): Promise<{ value: number; label: string }> {
  try {
    const res = await fetchWithTimeout('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const val = Math.round(data?.fear_and_greed?.score || 50)
      return { value: val, label: getFGLabel(val) }
    }
  } catch { /* fallthrough */ }
  return { value: 50, label: 'Neutral' }
}

function getFGLabel(v: number): string {
  if (v <= 25) return 'Extreme Fear'
  if (v <= 40) return 'Fear'
  if (v <= 60) return 'Neutral'
  if (v <= 75) return 'Greed'
  return 'Extreme Greed'
}

// ============================================================
// SENTIMENT HELPERS
// ============================================================
const bullishWords = ['surge', 'rally', 'beat', 'record', 'growth', 'profit', 'strong', 'upgrade', 'buy', 'bull', 'rise', 'gain', 'positive', 'exceed', 'outperform', 'boost', 'breakout', 'recovery']
const bearishWords = ['fall', 'drop', 'miss', 'loss', 'weak', 'downgrade', 'sell', 'bear', 'decline', 'cut', 'concern', 'risk', 'warn', 'crash', 'plunge', 'hurt', 'fear', 'layoff', 'investigation']

function getSentimentScore(text: string): number {
  const lower = text.toLowerCase()
  let score = 0
  bullishWords.forEach(w => { if (lower.includes(w)) score += 0.08 })
  bearishWords.forEach(w => { if (lower.includes(w)) score -= 0.08 })
  return Math.max(-1, Math.min(1, score))
}

function scoreSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const s = getSentimentScore(text)
  return s > 0.08 ? 'positive' : s < -0.08 ? 'negative' : 'neutral'
}

// ============================================================
// MOCK DATA FALLBACKS
// ============================================================
function getMockQuote(symbol: string): Quote {
  const prices: Record<string, number> = {
    AAPL: 211.50, TSLA: 248.30, NVDA: 875.20, SPY: 550.40,
    QQQ: 467.80, AMZN: 192.30, MSFT: 415.60, META: 512.40,
    GOOGL: 178.90, AMD: 162.40, PLTR: 28.60, GME: 22.10,
  }
  const price = prices[symbol] || 150 + Math.random() * 200
  const change = (Math.random() - 0.45) * price * 0.035
  return {
    symbol, name: symbol, price,
    change, changePercent: (change / price) * 100,
    open: price - change * 0.3,
    high: price + Math.abs(change) * 1.3,
    low: price - Math.abs(change) * 1.6,
    prevClose: price - change,
    volume: Math.floor(Math.random() * 50000000) + 5000000,
    avgVolume: Math.floor(Math.random() * 40000000) + 10000000,
    beta: 0.8 + Math.random() * 1.5,
    pe: 15 + Math.random() * 35,
    eps: 2 + Math.random() * 8,
    marketCap: price * (Math.random() * 5e9 + 1e9),
    week52High: price * (1.1 + Math.random() * 0.25),
    week52Low: price * (0.65 + Math.random() * 0.2),
    source: 'Mock',
  }
}

function getMockCandles(symbol: string): Candle[] {
  const basePrice = 150 + Math.random() * 200
  let price = basePrice
  const now = Date.now()
  return Array.from({ length: 60 }, (_, i) => {
    const change = (Math.random() - 0.48) * price * 0.022
    const open = price; price += change
    return {
      time: now - (59 - i) * 86400000,
      open, high: Math.max(open, price) * (1 + Math.random() * 0.005),
      low: Math.min(open, price) * (1 - Math.random() * 0.005),
      close: price, volume: Math.floor(Math.random() * 25000000) + 3000000,
    }
  })
}

function getMockTechnicals(price: number): TechnicalIndicators {
  return {
    rsi14: 45 + Math.random() * 20, macd: (Math.random() - 0.5) * 3,
    macdSignal: (Math.random() - 0.5) * 2.5, macdHist: (Math.random() - 0.5) * 1,
    sma20: price * (0.97 + Math.random() * 0.06), sma50: price * (0.93 + Math.random() * 0.1),
    sma200: price * (0.85 + Math.random() * 0.15), ema9: price * (0.99 + Math.random() * 0.02),
    ema21: price * (0.98 + Math.random() * 0.04), bbUpper: price * 1.05,
    bbMiddle: price * 0.99, bbLower: price * 0.93, bbWidth: 0.08 + Math.random() * 0.06,
    atr14: price * 0.02, vwap: price * (0.99 + Math.random() * 0.02),
    obv: (Math.random() - 0.5) * 1e8, adx: 20 + Math.random() * 30,
    stochK: 30 + Math.random() * 50, stochD: 30 + Math.random() * 45,
    priceVsSma20: (Math.random() - 0.4) * 6, priceVsSma50: (Math.random() - 0.35) * 10,
    priceVsSma200: (Math.random() - 0.3) * 20, volumeRatio: 0.6 + Math.random() * 1.8,
    source: 'Mock',
  }
}

function getMockFundamentals(symbol: string, price: number): Fundamentals {
  const dcf = price * (0.85 + Math.random() * 0.4)
  return {
    pe: 15 + Math.random() * 35, pb: 1.5 + Math.random() * 6,
    ps: 2 + Math.random() * 8, evEbitda: 8 + Math.random() * 20,
    dcfValue: +dcf.toFixed(2), dcfUpside: +(((dcf - price) / price) * 100).toFixed(1),
    analystTargetHigh: +(price * (1.15 + Math.random() * 0.2)).toFixed(2),
    analystTargetLow: +(price * (0.85 + Math.random() * 0.1)).toFixed(2),
    analystTargetMean: +(price * (1.05 + Math.random() * 0.1)).toFixed(2),
    analystBuy: Math.floor(Math.random() * 20) + 5,
    analystHold: Math.floor(Math.random() * 10) + 2,
    analystSell: Math.floor(Math.random() * 5),
    analystConsensus: 'Buy',
    debtToEquity: 0.2 + Math.random() * 1.5, currentRatio: 1.2 + Math.random() * 2,
    freeCashFlowPerShare: 2 + Math.random() * 10,
    revenueGrowthYoy: -5 + Math.random() * 30, epsGrowthYoy: -10 + Math.random() * 40,
    grossMargin: 30 + Math.random() * 40, netMargin: 5 + Math.random() * 25,
    roe: 5 + Math.random() * 30,
    insiderBuys: Math.floor(Math.random() * 8),
    insiderSells: Math.floor(Math.random() * 12),
    insiderNetShares: Math.floor((Math.random() - 0.5) * 100000),
    insiderSentiment: ['BUYING', 'SELLING', 'NEUTRAL'][Math.floor(Math.random() * 3)] as any,
    nextEarningsDate: new Date(Date.now() + (20 + Math.random() * 60) * 86400000).toISOString().split('T')[0],
    daysToEarnings: Math.floor(20 + Math.random() * 60),
    lastEpsActual: 1.5 + Math.random() * 3, lastEpsEstimate: 1.4 + Math.random() * 3,
    lastEpsSurprise: -5 + Math.random() * 20,
    institutionalOwnership: 40 + Math.random() * 45,
  }
}

function getMockMacro(): MacroData {
  return {
    fedFundsRate: 3.625, fedFundsRatePrev: 3.625,
    yieldCurve10Y2Y: 0.42, yieldCurve10Y3M: -0.1,
    cpiYoy: 2.7, corePceYoy: 2.6, unemploymentRate: 4.1,
    m2Growth: 3.2, gdpGrowth: 2.4,
    recessionRisk: 'LOW', rateEnvironment: 'HOLDING',
    inflationTrend: 'STABLE', yieldCurveStatus: 'NORMAL',
    macroScore: 0.5,
  }
}

function getMockSentiment(): SocialSentiment {
  const fg = Math.floor(35 + Math.random() * 30)
  return {
    redditMentions: Math.floor(20 + Math.random() * 80),
    redditSentimentScore: (Math.random() - 0.4) * 0.8,
    twitterVolume: Math.floor(100 + Math.random() * 500),
    twitterSentiment: (Math.random() - 0.4) * 0.7,
    overallSentiment: (Math.random() - 0.4) * 0.6,
    trend: ['rising', 'stable', 'falling'][Math.floor(Math.random() * 3)] as any,
    fearGreedIndex: fg, fearGreedLabel: getFGLabel(fg),
  }
}

function getMockNews(symbol: string): NewsItem[] {
  return [
    { headline: `${symbol} Reports Strong Quarterly Earnings, Beats Estimates`, summary: 'Revenue and EPS both exceeded analyst expectations for the quarter.', source: 'Reuters', datetime: Date.now() / 1000 - 3600, url: '#', sentiment: 'positive', sentimentScore: 0.7 },
    { headline: `Analyst Upgrades ${symbol} to Outperform, Raises Target`, summary: 'Wall Street firm raises price target citing AI-driven revenue growth.', source: 'Bloomberg', datetime: Date.now() / 1000 - 7200, url: '#', sentiment: 'positive', sentimentScore: 0.6 },
    { headline: `Market Uncertainty Weighs on ${symbol} Shares`, summary: 'Geopolitical tensions and rising oil prices create headwinds for equities.', source: 'CNBC', datetime: Date.now() / 1000 - 14400, url: '#', sentiment: 'negative', sentimentScore: -0.4 },
    { headline: `${symbol} Insider Purchases Signal Executive Confidence`, summary: 'C-suite executives bought shares on the open market this week.', source: 'MarketWatch', datetime: Date.now() / 1000 - 28800, url: '#', sentiment: 'positive', sentimentScore: 0.5 },
  ]
}

function getMockOptionsChain(symbol: string, price: number): OptionsChain {
  const expDates = [
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
    new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
  ]
  const calls: OptionContract[] = [], puts: OptionContract[] = []
  expDates.forEach(exp => {
    const daysToExp = (new Date(exp).getTime() - Date.now()) / 86400000
    const tv = Math.sqrt(daysToExp / 365)
    for (let i = -4; i <= 5; i++) {
      const strike = Math.round(price * (1 + i * 0.025) / 5) * 5
      const otm = Math.abs(i) * 0.025
      const iv = 0.25 + otm * 0.5 + Math.random() * 0.1
      const cP = Math.max(0.05, (i < 0 ? price - strike : 0) + price * iv * tv * 0.4)
      const pP = Math.max(0.05, (i > 0 ? strike - price : 0) + price * iv * tv * 0.4)
      const delta = i < 0 ? 0.5 + Math.abs(i) * 0.12 : Math.max(0.05, 0.5 - i * 0.12)
      calls.push({ strike, expiration: exp, bid: +(cP * 0.95).toFixed(2), ask: +(cP * 1.05).toFixed(2), last: +cP.toFixed(2), volume: Math.floor(Math.random() * 5000) + 100, openInterest: Math.floor(Math.random() * 20000) + 500, impliedVolatility: iv, delta, gamma: 0.02 + Math.random() * 0.03, theta: -(cP * 0.01), vega: cP * 0.05, type: 'call', inTheMoney: strike < price })
      puts.push({ strike, expiration: exp, bid: +(pP * 0.95).toFixed(2), ask: +(pP * 1.05).toFixed(2), last: +pP.toFixed(2), volume: Math.floor(Math.random() * 3000) + 50, openInterest: Math.floor(Math.random() * 15000) + 300, impliedVolatility: iv, delta: -delta, gamma: 0.02 + Math.random() * 0.03, theta: -(pP * 0.01), vega: pP * 0.05, type: 'put', inTheMoney: strike > price })
    }
  })
  return { calls, puts, expirations: expDates }
}
