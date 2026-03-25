# APEX TRADER — Intelligence Platform

A professional-grade trading intelligence dashboard built with Next.js 14. Provides real-time technical analysis, AI-powered options recommendations, social sentiment scoring, and catalyst detection for day trading, swing trading, and long-term positions.

---

## Features

- **Technical Analysis** — RSI, MACD, Bollinger Bands, VWAP, 6 moving averages, Stochastic, ATR, ADX, volume ratio, OBV
- **Price Targets** — Pivot points, support/resistance levels, stop loss, and 3 profit targets calibrated to trade mode
- **Options Intelligence** — AI-recommended strategy (calls, spreads, puts, iron condors), specific strikes and expirations, breakeven, max profit/loss, Greeks
- **Social Sentiment** — Reddit mention velocity, sentiment scoring, Twitter/X volume estimate, Fear & Greed Index
- **Catalyst Detection** — Automated detection of BB squeezes, RSI extremes, MACD crossovers, volume surges, key level tests
- **News Feed** — Recent headlines with bullish/bearish sentiment classification
- **AI Narrative Brief** — Claude-powered 3-sentence analyst summary for each analysis
- **Three Trade Modes** — Day (intraday), Swing (days-weeks), Long (months)

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** (custom dark terminal design system)
- **Recharts** (charts)
- **Anthropic Claude API** (AI narrative analysis)
- **Finnhub API** (quotes, options chain, news) — free tier
- **Alpha Vantage API** (candle data, technicals) — free tier
- **Reddit Public JSON API** (social sentiment) — no key required
- **CNN Fear & Greed** (market sentiment) — no key required

**Estimated monthly cost: $0** (all free tiers, Anthropic API minimal usage at ~200 tokens/analysis)

---

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/apex-trader.git
cd apex-trader
npm install
```

### 2. Get your free API keys

**Finnhub** (free, no credit card):
1. Go to https://finnhub.io/register
2. Verify email
3. Copy your API key from the dashboard

**Alpha Vantage** (free, no credit card):
1. Go to https://www.alphavantage.co/support/#api-key
2. Enter your email
3. Get your key instantly

**Anthropic** (for AI summaries):
1. Go to https://console.anthropic.com
2. Create API key
3. Note: ~$0.003 per analysis at current pricing

### 3. Set environment variables
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
FINNHUB_API_KEY=your_finnhub_key
ALPHA_VANTAGE_KEY=your_alpha_vantage_key
ANTHROPIC_API_KEY=your_anthropic_key
```

> **Note:** The platform works without API keys using realistic mock data. Add keys to get live market data.

### 4. Run locally
```bash
npm run dev
```

Open http://localhost:3000

---

## Deploy to Vercel

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

Set environment variables when prompted, or add them in the Vercel dashboard under Settings → Environment Variables.

### Option B — GitHub Integration
1. Push repo to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repo
4. Add environment variables in the setup wizard:
   - `FINNHUB_API_KEY`
   - `ALPHA_VANTAGE_KEY`
   - `ANTHROPIC_API_KEY`
5. Deploy

---

## Free Tier Limits

| Service | Free Limit | Notes |
|---|---|---|
| Finnhub | 60 calls/min | Quote, options, news |
| Alpha Vantage | 25 calls/day | Candle data |
| Reddit JSON | Unlimited | No key needed |
| CNN Fear/Greed | Unlimited | No key needed |
| Anthropic Claude | Pay per use | ~$0.003/analysis |

**For heavier usage:** Alpha Vantage's 25/day limit is the tightest constraint. The app caches candle data for 5 minutes (Vercel edge cache) to minimize API hits. For personal use (10-20 analyses/day), this is fine. For more, upgrade to Alpha Vantage's $50/month tier.

---

## Architecture

```
apex-trader/
├── app/
│   ├── api/
│   │   └── analyze/route.ts    # Main analysis API endpoint
│   ├── page.tsx                # Dashboard UI
│   ├── layout.tsx              # Root layout + fonts
│   └── globals.css             # Design system
├── lib/
│   ├── marketData.ts           # Data fetching + mock fallbacks
│   └── analysis.ts             # Scoring engine + recommendations
├── vercel.json                 # Deployment config
└── .env.local.example          # API key template
```

### Scoring System

The composite score runs from -7 to +7 across 5 dimensions:

| Dimension | Max Score | What it measures |
|---|---|---|
| Trend | ±2 | Price vs key MAs, VWAP relationship |
| Momentum | ±2 | RSI, MACD, Stochastic, BB position |
| Volume | ±1 | Volume ratio vs 20-day average |
| Sentiment | ±1 | Fear/Greed + social sentiment score |
| Volatility | ±1 | ATR as % of price, mode-adjusted |

Score → Signal mapping:
- ≥ 4.0: STRONG BUY
- ≥ 2.0: BUY
- ≥ -1.0: NEUTRAL
- ≥ -3.0: SELL
- < -3.0: STRONG SELL

---

## Disclaimer

This platform is for educational and informational purposes only. It does not constitute financial advice. All analysis is algorithmic and based on historical data and publicly available information. Past performance does not guarantee future results. Trade at your own risk.

---

## License

MIT
