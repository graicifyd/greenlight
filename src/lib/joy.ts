import type { Scene } from '../components/Illustrations'
import type { Light } from '../engine/engine'

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
export const pick = <T,>(list: readonly T[], seed: string, offset = 0): T => list[(hash(seed) + offset) % list.length]

export function pickMany<T>(list: readonly T[], seed: string, n: number, offset = 0): T[] {
  const start = hash(seed) + offset * n
  return Array.from({ length: Math.min(n, list.length) }, (_, i) => list[(start + i) % list.length])
}

export const YES_SCENES: Scene[] = ['beach', 'dance', 'bloom']
export const CAREFUL_SCENES: Scene[] = ['cozy', 'laptop', 'bloom']

export const YES_MESSAGES = [
  'Your body, your joy. Today is yours to enjoy — lose yourself a little.',
  'You’ve been taking such good care of yourself. Relax, feel wanted, have fun.',
  'Soft light, good music, zero worry. You deserve a day like this.',
  'Today your only job is to feel good. Let yourself.',
  'You know your rhythm beautifully. Go enjoy that glow.',
]

export const CAREFUL_MESSAGES = [
  'Your body is doing something powerful right now. Let’s keep today about closeness, not risk.',
  'Careful doesn’t mean off-limits — it means playful, creative and still very much yours.',
  'Protecting your plans is an act of self-love. We’re so proud of you.',
  'A few careful days, then back to carefree. You’ve got this, beautiful.',
  'Tender, slow, no pressure. The best nights don’t need a risk.',
]

export const PARTNER_YES = (name: string) => [
  `A yes day for ${name}. Make her feel adored — the rest will follow.`,
  `${name} can relax today. Slow down, be present, enjoy each other.`,
]
export const PARTNER_CAREFUL = (name: string) => [
  `${name} is in her careful days. Bring a condom, or bring your creativity.`,
  `Careful days for ${name} — be the reason she feels safe and spoiled.`,
]

export interface Idea {
  title: string
  body: string
}

/** Close and sensual without penetrative sex. */
export const CAREFUL_IDEAS: Idea[] = [
  { title: 'Slow massage night', body: 'Warm oil, candles, phones away. Take turns — no rushing, no destination.' },
  { title: 'Shower together', body: 'Steam, soap and slow hands. Closeness without any risk at all.' },
  { title: 'Make out like it’s new', body: 'Just kissing, on the couch, for as long as you both like. It’s underrated.' },
  { title: 'Explore with hands', body: 'Mutual touch is intimate and zero-risk. Show each other exactly what feels good.' },
  { title: 'Her pleasure first', body: 'Oral, a favourite toy, or both — tonight is all about her, no penetration needed.' },
  { title: 'Tell each other a fantasy', body: 'Share one thing you’ve wanted to try. Talking about it can be just as exciting.' },
  { title: 'Date night in', body: 'Dress up, cook together, slow dance in the kitchen. Romance is foreplay.' },
  { title: 'Body map', body: 'Blindfold on, and find three new places she loves being kissed.' },
  { title: 'Solo self-love', body: 'Some nights are just for you. A bath, a toy, your own pace — pure self-care.' },
  { title: 'Condom, if you want more', body: 'If you both want sex, a condom used right from the start keeps today safe.' },
]

/** Ideas for yes days — playful exploration. */
export const YES_IDEAS: Idea[] = [
  { title: 'Try somewhere new', body: 'A different room, a different time of day. Novelty is a turn-on.' },
  { title: 'Let her lead', body: 'She sets the pace, the position and the playlist tonight.' },
  { title: 'Lazy morning', body: 'No alarm, no plans. Stay in bed a little longer together.' },
  { title: 'Ask, then listen', body: '“What would feel amazing right now?” Then do exactly that.' },
  { title: 'Aftercare counts', body: 'Cuddles, water, a snack, sweet words. How it ends matters as much.' },
  { title: 'Slow it all down', body: 'Twice as much foreplay as usual. She’ll thank you.' },
]

export function sceneFor(light: Light, seed: string): Scene {
  return pick(light === 'green' ? YES_SCENES : CAREFUL_SCENES, seed)
}
