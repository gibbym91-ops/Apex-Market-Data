// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  getQuote, getCandles, getTechnicals, getFundamentals,
  getMacroData, getNews, getSocialSentiment, getOptionsChain
} from '@/lib/marketData'
import {
  scoreStock, getSignal, calculatePriceTargets,
  recommendOptions, detectCatalysts
} from '@/lib/analysis'
import type { TradeMode } from '@/lib/analysis'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30 // Vercel function timeout

export async function POST(req: NextRequest) {
  try {
    const { symbol, mode } = await req.json() as { symbol: string; mode: TradeMode }
    if (!symbol || !mode) return NextResponse.json({ error: 'Symbol and mode required' }, { status: 400 })

    const sym = symbol.toUpperCase().trim()

    // ---- Phase 1: Parallel data fetch ----
    // Quote + candles + macro can all run simultaneously
    const [quote, candles, macro, news, sentiment] = await Promise.all([
      getQuote(sym),
      getCandles(sym, mode),
      getMacroData(),
      getNews(sym),
      getSocialSentiment(sym),
    ])

    if (!quote || !quote.price) {
      return NextResponse.json({ error: `Could not fetch data for ${sym}` }, { status: 404 })
    }

    // ---- Phase 2: Dependent fetches (need quote price) ----
    const [tech, fundamentals, optionsChain] = await Promise.all([
      getTechnicals(sym, candles, quote.price),
      getFundamentals(sym, quote.price),
      getOptionsChain(sym, quote.price),
    ])

    // ---- Phase 3: Analysis ----
    const score = scoreStock(quote, tech, sentiment, fundamentals, macro, mode)
    const { signal, conviction } = getSignal(score)
    const targets = calculatePriceTargets(quote, tech, fundamentals, mode)
    const optionsRec = recommendOptions(quote, tech, optionsChain, signal, mode, targets)
    const catalysts = detectCatalysts(quote, tech, sentiment, fundamentals, macro)

    // ---- Phase 4: AI Narrative Brief ----
    let aiSummary = ''
    try {
      const client = new Anthropic()
      const prompt = `You are a senior trading analyst giving a rapid briefing. Generate exactly 3 punchy, data-driven sentences for ${sym}.

Trade Mode: ${mode.toUpperCase()}
Signal: ${signal} | Conviction: ${conviction}
Score: ${score.total.toFixed(2)}/10 (Trend:${score.trend} Mom:${score.momentum} Vol:${score.volume} Sent:${score.sentiment} Fund:${score.fundamental} Macro:${score.macro})

Price: $${quote.price.toFixed(2)} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)
RSI: ${tech.rsi14.toFixed(1)} | MACD Hist: ${tech.macdHist.toFixed(3)} | ADX: ${tech.adx.toFixed(1)} | Vol Ratio: ${tech.volumeRatio.toFixed(2)}x
vs SMA50: ${tech.priceVsSma50.toFixed(1)}% | vs SMA200: ${tech.priceVsSma200.toFixed(1)}%

DCF Upside: ${fundamentals.dcfUpside.toFixed(1)}% | Analyst: ${fundamentals.analystConsensus} (${fundamentals.analystBuy}B/${fundamentals.analystHold}H/${fundamentals.analystSell}S)
Insider: ${fundamentals.insiderSentiment} | EPS Surprise: ${fundamentals.lastEpsSurprise.toFixed(1)}% | Days to Earnings: ${fundamentals.daysToEarnings}

FRED: FFR ${macro.fedFundsRate}% | Yield Curve ${macro.yieldCurveStatus} (${macro.yieldCurve10Y2Y.toFixed(2)}%) | CPI ${macro.cpiYoy.toFixed(1)}% | Recession Risk: ${macro.recessionRisk}
Fear/Greed: ${sentiment.fearGreedIndex} (${sentiment.fearGreedLabel}) | Reddit: ${sentiment.redditMentions} mentions | Trend: ${sentiment.trend}

Sentence 1: The primary technical signal and what's driving it (use specific numbers).
Sentence 2: The key fundamental or macro factor that supports or undermines this signal.
Sentence 3: One specific thing to watch for as a trade trigger or risk. Be actionable.
Speak like a desk head briefing the team. No disclaimers.`

      const resp = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 220,
        messages: [{ role: 'user', content: prompt }],
      })
      aiSummary = resp.content[0].type === 'text' ? resp.content[0].text : ''
    } catch (e) {
      // Fallback summary without AI
      aiSummary = `${sym} registering a ${signal} signal (${score.total.toFixed(2)}/10) with ${conviction.toLowerCase()} conviction on ${mode} timeframe. ` +
        `RSI at ${tech.rsi14.toFixed(0)}, ${tech.priceVsSma200 > 0 ? `trading ${tech.priceVsSma200.toFixed(1)}% above` : `${Math.abs(tech.priceVsSma200).toFixed(1)}% below`} the 200 SMA, with volume running ${tech.volumeRatio.toFixed(1)}x average — ${fundamentals.analystConsensus} analyst consensus with DCF suggesting ${fundamentals.dcfUpside > 0 ? `${fundamentals.dcfUpside.toFixed(0)}% upside` : `${Math.abs(fundamentals.dcfUpside).toFixed(0)}% downside`} to fair value. ` +
        `Watch the $${targets.support1.toFixed(2)} support level and $${targets.resistance1.toFixed(2)} resistance; macro backdrop is ${macro.rateEnvironment} rates with ${macro.recessionRisk.toLowerCase()} recession risk.`
    }

    // Key levels list
    const keyLevels = [
      `VWAP: $${tech.vwap.toFixed(2)}`,
      `EMA 9: $${tech.ema9.toFixed(2)}`,
      `EMA 21: $${tech.ema21.toFixed(2)}`,
      `SMA 20: $${tech.sma20.toFixed(2)}`,
      `SMA 50: $${tech.sma50.toFixed(2)}`,
      `SMA 200: $${tech.sma200.toFixed(2)}`,
      `BB Upper: $${tech.bbUpper.toFixed(2)}`,
      `BB Lower: $${tech.bbLower.toFixed(2)}`,
    ]

    // Risk flags
    const risks = [
      tech.rsi14 > 70 ? `Overbought RSI (${tech.rsi14.toFixed(1)}) — pullback risk elevated` : null,
      tech.rsi14 < 30 ? `Oversold RSI (${tech.rsi14.toFixed(1)}) — potential continuation lower or bounce` : null,
      tech.volumeRatio < 0.6 ? 'Low volume — move may lack institutional conviction' : null,
      fundamentals.daysToEarnings <= 7 && fundamentals.daysToEarnings > 0 ? `Earnings in ${fundamentals.daysToEarnings} days — binary event risk` : null,
      fundamentals.debtToEquity > 2 ? `High debt/equity ratio (${fundamentals.debtToEquity.toFixed(2)}) — leverage risk` : null,
      macro.yieldCurveStatus === 'INVERTED' ? `Inverted yield curve — recession signal, watch macro deterioration` : null,
      macro.recessionRisk === 'HIGH' ? 'FRED data shows elevated recession risk — reduce position size' : null,
      sentiment.fearGreedIndex > 78 ? 'Extreme Greed — market complacency elevated, tighten stops' : null,
      fundamentals.insiderSentiment === 'SELLING' ? `Insiders selling (${fundamentals.insiderSells} transactions) — watch for distribution` : null,
      quote.beta && quote.beta > 1.8 ? `High beta (${quote.beta.toFixed(2)}) — amplified market moves in both directions` : null,
      tech.bbWidth < 0.03 ? 'Extreme BB squeeze — sharp move imminent, direction unknown' : null,
    ].filter(Boolean) as string[]

    return NextResponse.json({
      symbol: sym,
      mode,
      signal,
      conviction,
      score,
      quote,
      tech,
      fundamentals,
      macro,
      sentiment,
      priceTargets: targets,
      optionsRec,
      catalysts,
      news: news.slice(0, 6),
      keyLevels,
      risks,
      summary: aiSummary,
      dataSources: {
        quote: quote.source,
        technicals: tech.source,
        options: 'Finnhub',
        news: 'Alpaca / Finnhub',
        fundamentals: 'FMP',
        macro: 'FRED',
        sentiment: 'Reddit + CNN Fear/Greed',
      },
      timestamp: Date.now(),
    })
  } catch (err) {
    console.error('Analysis error:', err)
    return NextResponse.json({ error: 'Analysis failed. Check server logs.' }, { status: 500 })
  }
}
