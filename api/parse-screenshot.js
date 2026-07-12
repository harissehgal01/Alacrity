// Vercel serverless function: reads Dota 2 post-match scoreboard screenshots
// with Claude vision and returns structured match JSON.
// Requires ANTHROPIC_API_KEY set in Vercel project env vars.

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

const PROMPT = `You are reading Dota 2 post-match scoreboard screenshots (1 or 2 pages of the same match).
Page 1 shows K/D/A, NET worth, items, LH/DN, GPM, XPM. Page 2 (if provided) shows damage dealt (hero/building), death losses, pick order.
Extract every player and return ONLY valid JSON, no markdown fences, no commentary, exactly this shape:
{
  "winner": "radiant" | "dire",
  "radiant_label": "<team name shown for the top team, e.g. The Radiant or a custom name>",
  "dire_label": "<team name shown for the bottom team>",
  "players": [
    {
      "persona": "<player name as shown>",
      "team": "radiant" | "dire",
      "hero": "<hero name in Title Case>",
      "kills": int, "deaths": int, "assists": int,
      "net_worth": int|null, "gpm": int|null, "xpm": int|null,
      "last_hits": int|null,
      "hero_damage": int|null, "tower_damage": int|null
    }
  ]
}
Rules:
- The team listed first/top is Radiant unless the screenshot clearly labels otherwise; custom team names (e.g. "Team Originals") may replace "The Radiant"/"The Dire" but position still determines side.
- The WINNER tag next to a team name identifies the winner.
- tower_damage = the BUILDING column under DAMAGE DEALT (page 2). hero_damage = the HERO column under DAMAGE DEALT (page 2). If page 2 is absent, set both null.
- Numbers may contain commas; strip them. Use null for anything unreadable. Exactly 10 players.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured in Vercel env vars.' })

  const { images } = req.body || {}
  if (!Array.isArray(images) || images.length === 0 || images.length > 2) {
    return res.status(400).json({ error: 'Send 1-2 images as [{ media_type, data }].' })
  }

  try {
    const content = [
      ...images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.media_type || 'image/jpeg', data: img.data },
      })),
      { type: 'text', text: PROMPT },
    ]
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content }],
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Anthropic API error' })
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (!parsed.players || !Array.isArray(parsed.players)) throw new Error('Malformed extraction')
    return res.status(200).json(parsed)
  } catch (e) {
    return res.status(500).json({ error: 'Could not read the screenshot: ' + (e.message || e) })
  }
}
