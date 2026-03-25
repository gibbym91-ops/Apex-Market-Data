// lib/analysis.ts
import type { Quote, TechnicalIndicators, SocialSentiment, OptionsChain, OptionContract, Fundamentals, MacroData } from './marketData'

export type TradeMode = 'day' | 'swing' | 'long'
export type Signal = 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL'
export type Conviction = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ScoreBreakdown {
  trend: number       // -2 to 2
  momentum: number    // -2 to 2
  volume: number      // -1 to 1
  sentiment: number   // -1 to 1
  volatility: number  // -1 to 1
  fundamental: number // -2 to 2 (NEW — from FMP)
  macro: number       // -1 to 1 (NEW — from FRED)
  total: number       // -10 to 10
}

export interface PriceTargets {
  dayLow: number
  dayHigh: number
  dayPivot: number
  support1: number
  support2: number
  resistance1: number
  resistance2: number
  stopLoss: number
  target1: number
  target2: number
  target3: number
  analystMean?: number
  analystHigh?: number
  dcfFairValue?: number
}

export interface OptionsRecommendation {
  strategy: string
  reasoning: string
  legs: OptionsLeg[]
  maxProfit: string
  maxLoss: string
  breakeven: string
  idealEntry: string
  idealExit: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH'
  bestContracts: OptionContract[]
}

export interface OptionsLeg {
  action: 'BUY' | 'SELL'
  type: 'CALL' | 'PUT'
  strike: string
  expiration: string
  quantity: number
  estimatedCost: string
  targetDelta: string
}

export interface Catalyst {
  type: 'earnings' | 'macro' | 'sector' | 'technical' | 'social' | 'news' | 'fundamental'
  description: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  direction: 'BULLISH' | 'BEARISH' | 'MIXED'
  timeframe: string
}

// ============================================================
// MASTER SCORING ENGINE
// ============================================================
export function scoreStock(
  quote: Quote,
  tech: TechnicalIndicators,
  sentiment: SocialSentiment,
  fundamentals: Fundamentals,
  macro: MacroData,
  mode: TradeMode
): ScoreBreakdown {
  const p = quote.price

  // ---- TREND (±2) ----
  let trend = 0
  if (mode === 'day') {
    if (p > tech.vwap) trend += 0.8; else trend -= 0.8
    if (tech.ema9 > tech.ema21) trend += 0.7; else trend -= 0.7
    if (p > tech.sma20) trend += 0.5; else trend -= 0.5
  } else if (mode === 'swing') {
    if (tech.ema9 > tech.ema21) trend += 0.6; else trend -= 0.6
    if (p > tech.sma50) trend += 0.8; else trend -= 0.8
    if (p > tech.sma20) trend += 0.6; else trend -= 0.6
  } else {
    if (tech.sma50 > tech.sma200) trend += 1.0; else trend -= 1.0
    if (p > tech.sma200) trend += 1.0; else trend -= 1.0
  }
  trend = clamp(trend, -2, 2)

  // ---- MOMENTUM (±2) ----
  let momentum = 0
  // RSI
  if (tech.rsi14 > 60) momentum += mode === 'long' ? 0.3 : 0.6
  else if (tech.rsi14 > 50) momentum += 0.3
  else if (tech.rsi14 < 30) momentum += mode === 'day' ? 0.8 : 0.4
  else if (tech.rsi14 < 40) momentum += 0.1
  else momentum -= 0.2
  // MACD
  if (tech.macdHist > 0 && tech.macd > tech.macdSignal) momentum += 0.7
  else if (tech.macdHist < 0) momentum -= 0.6
  // Stochastic
  if (tech.stochK < 20) momentum += mode === 'day' ? 0.6 : 0.3
  else if (tech.stochK > 80) momentum -= 0.3
  // Bollinger
  if (p > tech.bbUpper) momentum -= 0.4
  else if (p < tech.bbLower) momentum += mode === 'day' ? 0.6 : 0.3
  if (tech.bbWidth < 0.04) momentum += 0.3 // squeeze
  momentum = clamp(momentum, -2, 2)

  // ---- VOLUME (±1) ----
  let volume = 0
  if (tech.volumeRatio > 2.5) volume += 0.9
  else if (tech.volumeRatio > 1.5) volume += 0.5
  else if (tech.volumeRatio > 1.0) volume += 0.2
  else if (tech.volumeRatio < 0.5) volume -= 0.5
  else volume -= 0.1
  volume = clamp(volume, -1, 1)

  // ---- SENTIMENT (±1) ----
  let sent = 0
  const fg = sentiment.fearGreedIndex
  if (fg < 25) sent += mode === 'long' ? 0.5 : 0.3
  else if (fg < 40) sent += 0.2
  else if (fg > 75) sent -= 0.3
  else if (fg > 60) sent += 0.1
  const social = sentiment.overallSentiment
  if (social > 0.4) sent += 0.4
  else if (social > 0.2) sent += 0.2
  else if (social < -0.3) sent -= 0.3
  if (sentiment.trend === 'rising') sent += 0.3
  else if (sentiment.trend === 'falling') sent -= 0.2
  sent = clamp(sent, -1, 1)

  // ---- VOLATILITY (±1) ----
  let vol = 0
  const atrPct = (tech.atr14 / quote.price) * 100
  if (mode === 'day') {
    if (atrPct > 3) vol += 0.6
    else if (atrPct > 1.5) vol += 0.3
    else vol -= 0.3
  } else {
    if (atrPct > 6) vol -= 0.5
    else if (atrPct > 2 && atrPct < 5) vol += 0.3
    else vol += 0.1
  }
  vol = clamp(vol, -1, 1)

  // ---- FUNDAMENTAL (±2) — from FMP ----
  let fundamental = 0
  if (mode !== 'day') { // fundamentals don't matter for intraday
    // DCF upside/downside
    if (fundamentals.dcfUpside > 20) fundamental += 0.8
    else if (fundamentals.dcfUpside > 5) fundamental += 0.4
    else if (fundamentals.dcfUpside < -20) fundamental -= 0.8
    else if (fundamentals.dcfUpside < -5) fundamental -= 0.4

    // Analyst consensus
    if (fundamentals.analystConsensus === 'Strong Buy') fundamental += 0.6
    else if (fundamentals.analystConsensus === 'Buy') fundamental += 0.3
    else if (fundamentals.analystConsensus === 'Sell') fundamental -= 0.3
    else if (fundamentals.analystConsensus === 'Strong Sell') fundamental -= 0.6

    // Insider signal
    if (fundamentals.insiderSentiment === 'BUYING') fundamental += 0.4
    else if (fundamentals.insiderSentiment === 'SELLING') fundamental -= 0.4

    // Earnings proximity (high impact catalyst)
    if (fundamentals.daysToEarnings <= 7) fundamental += mode === 'long' ? 0 : 0.2 // event risk
    if (fundamentals.lastEpsSurprise > 10) fundamental += 0.3
    else if (fundamentals.lastEpsSurprise < -10) fundamental -= 0.3

    // Financial health
    if (fundamentals.currentRatio > 2) fundamental += 0.2
    else if (fundamentals.currentRatio < 1) fundamental -= 0.3
    if (fundamentals.freeCashFlowPerShare > 0) fundamental += 0.2
    else fundamental -= 0.2
  }
  fundamental = clamp(fundamental, -2, 2)

  // ---- MACRO (±1) — from FRED ----
  let macroScore = 0
  if (mode !== 'day') {
    macroScore += clamp(macro.macroScore * 0.33, -1, 1)
    // Yield curve adds weight for long-term
    if (mode === 'long') {
      if (macro.yieldCurveStatus === 'INVERTED') macroScore -= 0.4
      else if (macro.yieldCurveStatus === 'NORMAL') macroScore += 0.2
    }
  }
  macroScore = clamp(macroScore, -1, 1)

  const total = trend + momentum + volume + sent + vol + fundamental + macroScore

  return {
    trend: +trend.toFixed(2),
    momentum: +momentum.toFixed(2),
    volume: +volume.toFixed(2),
    sentiment: +sent.toFixed(2),
    volatility: +vol.toFixed(2),
    fundamental: +fundamental.toFixed(2),
    macro: +macroScore.toFixed(2),
    total: +total.toFixed(2),
  }
}

// ============================================================
// SIGNAL FROM SCORE
// ============================================================
export function getSignal(score: ScoreBreakdown): { signal: Signal; conviction: Conviction } {
  const t = score.total
  const max = 10

  let signal: Signal
  if (t >= 5) signal = 'STRONG BUY'
  else if (t >= 2.5) signal = 'BUY'
  else if (t >= -1.5) signal = 'NEUTRAL'
  else if (t >= -4) signal = 'SELL'
  else signal = 'STRONG SELL'

  const pct = Math.abs(t) / max
  const conviction: Conviction = pct >= 0.5 ? 'HIGH' : pct >= 0.28 ? 'MEDIUM' : 'LOW'
  return { signal, conviction }
}

// ============================================================
// PRICE TARGETS — enriched with FMP analyst data
// ============================================================
export function calculatePriceTargets(
  quote: Quote,
  tech: TechnicalIndicators,
  fundamentals: Fundamentals,
  mode: TradeMode
): PriceTargets {
  const p = quote.price
  const atr = tech.atr14
  const atrMult = mode === 'day' ? 1 : mode === 'swing' ? 2 : 4

  const dayPivot = (quote.high + quote.low + p) / 3
  const support1 = 2 * dayPivot - quote.high
  const support2 = dayPivot - (quote.high - quote.low)
  const resistance1 = 2 * dayPivot - quote.low
  const resistance2 = dayPivot + (quote.high - quote.low)

  const target1 = p + atr * atrMult * 0.8
  const target2 = p + atr * atrMult * 1.5
  const target3 = mode === 'long' && fundamentals.analystTargetMean > p
    ? fundamentals.analystTargetMean  // use analyst mean for long-term T3
    : p + atr * atrMult * 2.5

  const stopLoss = p - atr * (mode === 'day' ? 0.8 : mode === 'swing' ? 1.5 : 3)

  return {
    dayLow: quote.low,
    dayHigh: quote.high,
    dayPivot: +dayPivot.toFixed(2),
    support1: +Math.max(support1, tech.bbLower).toFixed(2),
    support2: +Math.min(support2, tech.sma50 * 0.97).toFixed(2),
    resistance1: +Math.min(resistance1, tech.bbUpper).toFixed(2),
    resistance2: +resistance2.toFixed(2),
    stopLoss: +stopLoss.toFixed(2),
    target1: +target1.toFixed(2),
    target2: +target2.toFixed(2),
    target3: +target3.toFixed(2),
    analystMean: fundamentals.analystTargetMean || undefined,
    analystHigh: fundamentals.analystTargetHigh || undefined,
    dcfFairValue: fundamentals.dcfValue || undefined,
  }
}

// ============================================================
// OPTIONS RECOMMENDATION ENGINE
// ============================================================
export function recommendOptions(
  quote: Quote,
  tech: TechnicalIndicators,
  chain: OptionsChain,
  signal: Signal,
  mode: TradeMode,
  targets: PriceTargets
): OptionsRecommendation {
  const p = quote.price
  const isBullish = signal === 'STRONG BUY' || signal === 'BUY'
  const isBearish = signal === 'STRONG SELL' || signal === 'SELL'
  const isStrong = signal === 'STRONG BUY' || signal === 'STRONG SELL'

  const expirations = chain.expirations
  const expIdx = mode === 'day' ? 0 : mode === 'swing' ? 1 : Math.min(2, expirations.length - 1)
  const exp = expirations[expIdx] || expirations[0] || ''

  let strategy = '', reasoning = '', riskLevel: OptionsRecommendation['riskLevel'] = 'MEDIUM'
  let legs: OptionsLeg[] = [], bestContracts: OptionContract[] = []

  if (mode === 'day') {
    if (isBullish) {
      strategy = 'ATM Call (Momentum Play)'
      reasoning = `Price above VWAP ($${tech.vwap.toFixed(2)}) with RSI ${tech.rsi14.toFixed(0)} and bullish MACD histogram. ATM call captures intraday momentum with defined risk.`
      riskLevel = 'HIGH'
      const c = chain.calls.filter(x => x.expiration === exp).sort((a, b) => Math.abs(a.strike - p) - Math.abs(b.strike - p))[0]
      if (c) { bestContracts = [c]; legs = [{ action: 'BUY', type: 'CALL', strike: `$${c.strike}`, expiration: exp, quantity: 1, estimatedCost: `$${(c.ask * 100).toFixed(0)}`, targetDelta: `~${((c.delta || 0.5) * 100).toFixed(0)}Δ` }] }
    } else if (isBearish) {
      strategy = 'ATM Put (Intraday Short Bias)'
      reasoning = `Price below VWAP with bearish internals. RSI ${tech.rsi14.toFixed(0)}, negative MACD. ATM put for quick directional play.`
      riskLevel = 'HIGH'
      const c = chain.puts.filter(x => x.expiration === exp).sort((a, b) => Math.abs(a.strike - p) - Math.abs(b.strike - p))[0]
      if (c) { bestContracts = [c]; legs = [{ action: 'BUY', type: 'PUT', strike: `$${c.strike}`, expiration: exp, quantity: 1, estimatedCost: `$${(c.ask * 100).toFixed(0)}`, targetDelta: `~${(Math.abs(c.delta || -0.5) * 100).toFixed(0)}Δ` }] }
    } else {
      strategy = 'Iron Condor (Range-Bound)'
      reasoning = 'Neutral signal with low directional conviction. Sell premium on both sides within the expected daily range.'
      riskLevel = 'MEDIUM'
    }
  } else if (mode === 'swing') {
    if (isStrong && isBullish) {
      strategy = 'Bull Call Spread (Defined Risk)'
      reasoning = `Strong buy signal, RSI ${tech.rsi14.toFixed(0)}, price above key MAs. Spread limits premium outlay while targeting $${targets.target2.toFixed(2)}.`
      riskLevel = 'MEDIUM'
      const buyCall = chain.calls.filter(x => x.expiration === exp && x.strike >= p * 0.99 && x.strike <= p * 1.02).sort((a, b) => a.strike - b.strike)[0]
      const sellCall = chain.calls.filter(x => x.expiration === exp && x.strike >= targets.resistance1).sort((a, b) => a.strike - b.strike)[0]
      if (buyCall && sellCall) {
        bestContracts = [buyCall, sellCall]
        legs = [
          { action: 'BUY', type: 'CALL', strike: `$${buyCall.strike}`, expiration: exp, quantity: 1, estimatedCost: `$${(buyCall.ask * 100).toFixed(0)}`, targetDelta: '~55Δ' },
          { action: 'SELL', type: 'CALL', strike: `$${sellCall.strike}`, expiration: exp, quantity: 1, estimatedCost: `-$${(sellCall.bid * 100).toFixed(0)}`, targetDelta: '~25Δ' },
        ]
      }
    } else if (isBullish) {
      strategy = 'OTM Call (Swing Long)'
      reasoning = `Buy signal with positive momentum. Slight OTM call gives leverage on a move to $${targets.target1.toFixed(2)}. IV at ${((chain.calls[0]?.impliedVolatility || 0.3) * 100).toFixed(0)}% — check if elevated ahead of earnings.`
      riskLevel = 'HIGH'
      const c = chain.calls.filter(x => x.expiration === exp && x.strike >= p * 1.01 && x.strike <= p * 1.06).sort((a, b) => Math.abs(a.impliedVolatility - 0.35) - Math.abs(b.impliedVolatility - 0.35))[0]
      if (c) { bestContracts = [c]; legs = [{ action: 'BUY', type: 'CALL', strike: `$${c.strike}`, expiration: exp, quantity: 1, estimatedCost: `$${(c.ask * 100).toFixed(0)}`, targetDelta: '~35Δ' }] }
    } else if (isBearish) {
      strategy = 'Bear Put Spread (Defined Risk Short)'
      reasoning = `Bearish signal. Put spread targets $${targets.target1.toFixed(2)} while capping premium risk.`
      riskLevel = 'MEDIUM'
      const buyPut = chain.puts.filter(x => x.expiration === exp && x.strike <= p * 1.01 && x.strike >= p * 0.98).sort((a, b) => b.strike - a.strike)[0]
      const sellPut = chain.puts.filter(x => x.expiration === exp && x.strike <= targets.support1).sort((a, b) => b.strike - a.strike)[0]
      if (buyPut && sellPut) {
        bestContracts = [buyPut, sellPut]
        legs = [
          { action: 'BUY', type: 'PUT', strike: `$${buyPut.strike}`, expiration: exp, quantity: 1, estimatedCost: `$${(buyPut.ask * 100).toFixed(0)}`, targetDelta: '~-50Δ' },
          { action: 'SELL', type: 'PUT', strike: `$${sellPut.strike}`, expiration: exp, quantity: 1, estimatedCost: `-$${(sellPut.bid * 100).toFixed(0)}`, targetDelta: '~-20Δ' },
        ]
      }
    } else {
      strategy = 'Cash-Secured Put (Wait for Entry)'
      reasoning = 'Neutral signal. Sell a put below support to collect premium while waiting for a directional confirmation or assignment at a discount.'
      riskLevel = 'LOW'
    }
  } else { // long
    if (isBullish) {
      strategy = 'Long-Dated ITM Call / LEAPS Proxy'
      reasoning = `Long-term thesis positive. Deep ITM LEAPS replicates stock ownership with ~60-70% less capital. Analyst mean target: $${targets.analystMean?.toFixed(2) || 'N/A'}. DCF fair value: $${targets.dcfFairValue?.toFixed(2) || 'N/A'}.`
      riskLevel = 'LOW'
    } else if (isBearish) {
      strategy = 'Protective Put / Portfolio Hedge'
      reasoning = `Bearish long-term outlook (fundamentals and macro). Consider reducing position size or buying 3-6 month puts as protection.`
      riskLevel = 'MEDIUM'
    } else {
      strategy = 'Covered Call (Income Generation)'
      reasoning = 'Neutral outlook. If holding shares, sell monthly OTM calls to generate income while the trend clarifies. Target 0.5-1% monthly premium.'
      riskLevel = 'LOW'
    }
  }

  const totalCost = bestContracts.reduce((sum, c) => sum + (c.ask || 0) * 100, 0)
  const refContract = bestContracts[0]

  return {
    strategy, reasoning, legs,
    maxProfit: `$${(Math.abs(targets.target1 - p) * 100).toFixed(0)} per contract (estimated)`,
    maxLoss: totalCost > 0 ? `$${totalCost.toFixed(0)} (premium paid)` : 'Spread width × 100',
    breakeven: refContract
      ? isBullish ? `$${(refContract.strike + (refContract.ask || 0)).toFixed(2)}` : `$${(refContract.strike - (refContract.ask || 0)).toFixed(2)}`
      : 'See leg details',
    idealEntry: `Within $${(tech.atr14 * 0.25).toFixed(2)} of current price at or near key support`,
    idealExit: mode === 'day'
      ? 'Take 30-50% profit or cut at -50% of premium'
      : mode === 'swing'
      ? `Target $${targets.target1.toFixed(2)}-$${targets.target2.toFixed(2)}, hard stop at $${targets.stopLoss.toFixed(2)}`
      : `Hold 3-12 months, target analyst mean $${(targets.analystMean || targets.target3).toFixed(2)}`,
    riskLevel,
    bestContracts: bestContracts.slice(0, 3),
  }
}

// ============================================================
// CATALYST DETECTION — enriched with FMP + FRED signals
// ============================================================
export function detectCatalysts(
  quote: Quote,
  tech: TechnicalIndicators,
  sentiment: SocialSentiment,
  fundamentals: Fundamentals,
  macro: MacroData
): Catalyst[] {
  const p = quote.price
  const catalysts: Catalyst[] = []

  // Technical
  if (tech.bbWidth < 0.04) {
    catalysts.push({ type: 'technical', description: 'Bollinger Band Squeeze — volatility coiling, imminent breakout', impact: 'HIGH', direction: 'MIXED', timeframe: '1-5 days' })
  }
  if (tech.macdHist > 0 && tech.macd < 0) {
    catalysts.push({ type: 'technical', description: 'MACD bullish crossover forming — momentum shift underway', impact: 'MEDIUM', direction: 'BULLISH', timeframe: '1-3 days' })
  }
  if (tech.rsi14 < 32) {
    catalysts.push({ type: 'technical', description: `RSI deeply oversold at ${tech.rsi14.toFixed(1)} — mean reversion bounce likely`, impact: 'MEDIUM', direction: 'BULLISH', timeframe: '1-3 days' })
  } else if (tech.rsi14 > 72) {
    catalysts.push({ type: 'technical', description: `RSI overbought at ${tech.rsi14.toFixed(1)} — pullback or consolidation likely`, impact: 'MEDIUM', direction: 'BEARISH', timeframe: '1-5 days' })
  }
  if (tech.volumeRatio > 2.5) {
    catalysts.push({ type: 'technical', description: `Volume surge ${tech.volumeRatio.toFixed(1)}x average — institutional activity detected`, impact: 'HIGH', direction: quote.changePercent > 0 ? 'BULLISH' : 'BEARISH', timeframe: 'Immediate' })
  }
  if (Math.abs(p - quote.week52High!) / (quote.week52High! || p) < 0.02) {
    catalysts.push({ type: 'technical', description: '52-week high test — breakout could trigger momentum buying', impact: 'HIGH', direction: 'BULLISH', timeframe: 'Immediate' })
  }

  // Fundamental / FMP
  if (fundamentals.daysToEarnings <= 14 && fundamentals.daysToEarnings > 0) {
    catalysts.push({ type: 'earnings', description: `Earnings in ${fundamentals.daysToEarnings} days (${fundamentals.nextEarningsDate}) — IV typically expands pre-earnings; consider vol plays`, impact: 'HIGH', direction: 'MIXED', timeframe: `${fundamentals.daysToEarnings} days` })
  }
  if (fundamentals.daysToEarnings === 0 || fundamentals.daysToEarnings === 1) {
    catalysts.push({ type: 'earnings', description: 'EARNINGS TOMORROW — high binary event risk, avoid naked options', impact: 'HIGH', direction: 'MIXED', timeframe: 'Immediate' })
  }
  if (fundamentals.lastEpsSurprise > 15) {
    catalysts.push({ type: 'fundamental', description: `Last quarter EPS beat by ${fundamentals.lastEpsSurprise.toFixed(1)}% — strong execution trend`, impact: 'MEDIUM', direction: 'BULLISH', timeframe: 'Ongoing' })
  } else if (fundamentals.lastEpsSurprise < -10) {
    catalysts.push({ type: 'fundamental', description: `Last quarter EPS missed by ${Math.abs(fundamentals.lastEpsSurprise).toFixed(1)}% — execution risk elevated`, impact: 'MEDIUM', direction: 'BEARISH', timeframe: 'Ongoing' })
  }
  if (fundamentals.insiderSentiment === 'BUYING' && fundamentals.insiderBuys >= 3) {
    catalysts.push({ type: 'fundamental', description: `${fundamentals.insiderBuys} insider purchases recently — strong executive confidence signal`, impact: 'MEDIUM', direction: 'BULLISH', timeframe: 'Days to weeks' })
  }
  if (fundamentals.dcfUpside > 25) {
    catalysts.push({ type: 'fundamental', description: `DCF analysis shows ${fundamentals.dcfUpside.toFixed(0)}% upside to fair value ($${fundamentals.dcfValue.toFixed(2)}) — valuation tailwind`, impact: 'MEDIUM', direction: 'BULLISH', timeframe: 'Weeks to months' })
  } else if (fundamentals.dcfUpside < -20) {
    catalysts.push({ type: 'fundamental', description: `DCF shows ${Math.abs(fundamentals.dcfUpside).toFixed(0)}% overvalued vs fair value ($${fundamentals.dcfValue.toFixed(2)}) — valuation headwind`, impact: 'MEDIUM', direction: 'BEARISH', timeframe: 'Weeks to months' })
  }

  // Macro / FRED
  if (macro.yieldCurveStatus === 'INVERTED') {
    catalysts.push({ type: 'macro', description: `Yield curve inverted (10Y-2Y: ${macro.yieldCurve10Y2Y.toFixed(2)}%) — historically a leading recession indicator`, impact: 'HIGH', direction: 'BEARISH', timeframe: 'Months' })
  }
  if (macro.recessionRisk === 'HIGH') {
    catalysts.push({ type: 'macro', description: 'FRED indicators signal HIGH recession risk — consider defensive positioning', impact: 'HIGH', direction: 'BEARISH', timeframe: '3-12 months' })
  }
  if (macro.rateEnvironment === 'CUTTING') {
    catalysts.push({ type: 'macro', description: `Fed actively cutting rates (FFR: ${macro.fedFundsRate}%) — tailwind for risk assets and growth stocks`, impact: 'MEDIUM', direction: 'BULLISH', timeframe: 'Months' })
  }
  if (macro.inflationTrend === 'RISING' && macro.cpiYoy > 4) {
    catalysts.push({ type: 'macro', description: `CPI at ${macro.cpiYoy.toFixed(1)}% and rising — rate hike risk increasing, growth multiples at risk`, impact: 'HIGH', direction: 'BEARISH', timeframe: 'Months' })
  }

  // Sentiment
  if (sentiment.fearGreedIndex < 25) {
    catalysts.push({ type: 'social', description: `Fear & Greed at ${sentiment.fearGreedIndex} (Extreme Fear) — historically strong contrarian buy signal`, impact: 'HIGH', direction: 'BULLISH', timeframe: 'Days to weeks' })
  } else if (sentiment.fearGreedIndex > 78) {
    catalysts.push({ type: 'social', description: `Fear & Greed at ${sentiment.fearGreedIndex} (Extreme Greed) — complacency signal, risk elevated`, impact: 'MEDIUM', direction: 'BEARISH', timeframe: 'Days to weeks' })
  }
  if (sentiment.trend === 'rising' && sentiment.redditMentions > 50) {
    catalysts.push({ type: 'social', description: `Viral social momentum — ${sentiment.redditMentions}+ Reddit mentions today, rising fast`, impact: 'MEDIUM', direction: 'BULLISH', timeframe: '1-3 days' })
  }

  // Sort by impact
  const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  return catalysts.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]).slice(0, 6)
}

// ============================================================
// HELPERS
// ============================================================
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`
}

export function getSignalClass(signal: Signal): string {
  switch (signal) {
    case 'STRONG BUY': return 'signal-strong-buy'
    case 'BUY': return 'signal-buy'
    case 'NEUTRAL': return 'signal-neutral'
    case 'SELL': return 'signal-sell'
    case 'STRONG SELL': return 'signal-strong-sell'
  }
}
