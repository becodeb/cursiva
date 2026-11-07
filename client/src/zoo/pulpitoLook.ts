// The child's own Pulpito: what colour he is and what he has on. Stored apart from the
// level records, in `cursiva.pulpito.v1`, and read tolerantly: a corrupt or hand-edited
// value is the Pulpito everyone starts with, never a broken screen.
//
// What he has EARNED is not stored here at all: `zoo/backpack.ts` derives it from the
// level records, so a colour or a hat can never outlive or invent progress. `given`
// only remembers which gifts he has already received, so each arrives once.
import type { Records } from './sectors'
import { earnedWearables, WEARABLES, type Wearable, type WearableId, type WearSlot } from './backpack'
import type { StorageLike } from './tracedLine'

export const PULPITO_LOOK_KEY = 'cursiva.pulpito.v1'

export type ColourId = 'naranja' | 'rosa' | 'violeta' | 'azul' | 'turquesa' | 'verde'

export interface PulpitoColour {
  readonly id: ColourId
  /** Spoken when the swatch is tapped. */
  readonly name: string
  /** Over the palette's keys: `body`, `shade` and the cheeks. */
  readonly colours: Readonly<Record<'body' | 'shade' | 'pink', string>>
}

/** A short list and never a picker: each one was checked against his white eyes, his
 *  ink mouth and his cream apron (`pulpitoLook.test.ts`), so no choice loses his face. */
export const PULPITO_COLOURS: readonly PulpitoColour[] = [
  { id: 'naranja', name: 'naranja', colours: { body: '#f7682c', shade: '#d04a17', pink: '#ffa68c' } },
  { id: 'rosa', name: 'rosa', colours: { body: '#e0538a', shade: '#b8336a', pink: '#ffb3cf' } },
  { id: 'violeta', name: 'violeta', colours: { body: '#8c62d9', shade: '#6a43b5', pink: '#d3b8f7' } },
  { id: 'azul', name: 'azul', colours: { body: '#2f86d4', shade: '#1f66ab', pink: '#a5d4f7' } },
  { id: 'turquesa', name: 'turquesa', colours: { body: '#14969a', shade: '#0d7276', pink: '#86e0dc' } },
  { id: 'verde', name: 'verde', colours: { body: '#3f9a4d', shade: '#2c7a39', pink: '#b4e6a5' } },
]

export interface PulpitoLook {
  readonly colour: ColourId
  readonly worn: readonly WearableId[]
  readonly given: readonly WearableId[]
}

export const DEFAULT_LOOK: PulpitoLook = { colour: 'naranja', worn: [], given: [] }

const COLOUR_IDS: ReadonlySet<string> = new Set(PULPITO_COLOURS.map((c) => c.id))
const WEARABLE_BY_ID: ReadonlyMap<string, Wearable> = new Map(WEARABLES.map((w) => [w.id, w]))

const knownIds = (raw: unknown): WearableId[] =>
  Array.isArray(raw) ? [...new Set(raw.filter((id): id is WearableId => typeof id === 'string' && WEARABLE_BY_ID.has(id)))] : []

/** One thing per slot: the last one wins, the way putting on a hat takes the old one off. */
function onePerSlot(ids: readonly WearableId[]): WearableId[] {
  const bySlot = new Map<WearSlot, WearableId>()
  for (const id of ids) bySlot.set(WEARABLE_BY_ID.get(id)!.slot, id)
  return ids.filter((id) => bySlot.get(WEARABLE_BY_ID.get(id)!.slot) === id)
}

/** Whatever storage holds, as a look: unknown parts simply fall away. */
export function parseLook(raw: unknown): PulpitoLook {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return DEFAULT_LOOK
  const { colour, worn, given } = raw as Record<string, unknown>
  return {
    colour: typeof colour === 'string' && COLOUR_IDS.has(colour) ? (colour as ColourId) : DEFAULT_LOOK.colour,
    worn: onePerSlot(knownIds(worn)),
    given: knownIds(given),
  }
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage ?? null
  } catch {
    return null
  }
}

export function loadLook(storage: StorageLike | null = browserStorage()): PulpitoLook {
  try {
    const raw = storage?.getItem(PULPITO_LOOK_KEY)
    return raw ? parseLook(JSON.parse(raw)) : DEFAULT_LOOK
  } catch {
    return DEFAULT_LOOK
  }
}

export function saveLook(look: PulpitoLook, storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.setItem(PULPITO_LOOK_KEY, JSON.stringify(look))
  } catch {
    // A full quota loses a hat, never a level.
  }
}

/** Puts one on, or takes it off if he has it on already. */
export function toggleWorn(look: PulpitoLook, id: WearableId): PulpitoLook {
  if (look.worn.includes(id)) return { ...look, worn: look.worn.filter((w) => w !== id) }
  return { ...look, worn: onePerSlot([...look.worn, id]) }
}

/** The gifts he has earned and not yet received. */
export function pendingGifts(look: PulpitoLook, records: Records): readonly Wearable[] {
  return earnedWearables(records).filter((w) => !look.given.includes(w.id))
}

/** One new gift goes straight on: that is the reward, on him, right away. A profile
 *  older than this feature receives all of them at once and is simply not dressed up
 *  for it: the choice stays with the child. */
export function receiveGifts(look: PulpitoLook, gifts: readonly Wearable[]): PulpitoLook {
  if (gifts.length === 0) return look
  const given = [...look.given, ...gifts.map((g) => g.id)]
  return { ...look, given, worn: gifts.length === 1 ? onePerSlot([...look.worn, gifts[0].id]) : look.worn }
}

/** What `Puppet` needs. Something on his head takes the cap's place. */
export function lookAccessories(look: PulpitoLook): Readonly<Partial<Record<WearableId | 'cap', boolean>>> {
  const out: Partial<Record<WearableId | 'cap', boolean>> = {}
  for (const id of look.worn) {
    out[id] = true
    if (WEARABLE_BY_ID.get(id)!.slot === 'head') out.cap = false
  }
  return out
}

export function lookColours(look: PulpitoLook): Readonly<Record<string, string>> | undefined {
  return look.colour === DEFAULT_LOOK.colour ? undefined : PULPITO_COLOURS.find((c) => c.id === look.colour)?.colours
}

/** One look for the whole session, shared by every Pulpito on screen. */
let current: PulpitoLook | null = null
const listeners = new Set<() => void>()

export function currentLook(): PulpitoLook {
  if (current === null) current = loadLook()
  return current
}

export function serverLook(): PulpitoLook {
  return DEFAULT_LOOK
}

export function setLook(look: PulpitoLook): void {
  current = look
  saveLook(look)
  for (const listener of [...listeners]) listener()
}

export function subscribeLook(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Tests only. */
export function forgetLook(): void {
  current = null
}
