// The art corridor: a walkable surface that IS a drawn cutout — a snake's
// body — rather than a painted band under the child's finger (`docs/13` §4,
// §8 row E). Pure, no React, no DOM. Owns ONE placement function
// (`placeArtCorridor`), shared by the renderer (`canvas/ArtCorridorLayer.tsx`),
// the engine (`levels/buildLevel.ts`'s derivation of `LevelTarget.artCorridor`)
// and the test that proves the two agree (`artCorridor.test.ts`'s
// "coincidence") — none of the three recomputes placement independently,
// because a test that did would prove nothing about what is actually drawn
// and scored (art-corridor spec, "One Shared Placement Function...").
import type { ArtImage } from '../detective/assets'
import type { ArtBox } from '../canvas/placeArt'
import { spinePolyline, transformPath } from './paths'

/**
 * One snake cutout's measured centreline, hand-copied from the rebuilt
 * `manifest.json` (`scripts/art/build_art.py`'s `sample_spine`), the way
 * every literal in `assets.ts`/`backdrops.ts` already is — guarded against
 * drift by `detective/artManifest.test.ts`, which is the mechanism, not a
 * promise.
 *
 * `fix-snakes-true-alignment`'s own correction of the previous shape: the
 * spine used to be reduced to a five-number closed-form fit (`mid` +
 * alternating half-arch `[width, rise]` pairs, replayed through
 * `spineWave`). That fit's own `halves` widths summed to the span between
 * its FIRST and LAST zero-crossing, which — by the fit's own documented
 * design — sat INSIDE `[traceFrom, traceTo]` by a margin (up to ~53 shipped
 * px on the small snake). But `placeArtCorridor`/`snakePathD` always started
 * replaying the halves at `traceFrom`, never at that inner crossing, so the
 * replayed curve silently drew a SHIFTED stretch of the fitted wave — a
 * phase error the fit's own low residual number never caught, because the
 * residual measured the fit against the data it was fitted to, not against
 * where the runtime actually drew it. Storing the measured points directly,
 * anchored so the first and last point sit exactly on `traceFrom`/
 * `traceTo`, removes the reduction and the anchor mismatch in one move.
 */
export interface DrawnSpine {
  /** The traceable span's mean centreline y, as a fraction of the cutout's
   *  height — still what `at.y` anchors the box against. */
  readonly mid: number
  /** `[xFrac, yFrac]` per sample, both as a fraction of the cutout's own
   *  width/height, `xFrac` STRICTLY ascending from `traceFrom` (first point)
   *  to `traceTo` (last point) inclusive. The measured centreline itself —
   *  lightly smoothed, evenly resampled — not a formula fitted to it. */
  readonly points: readonly (readonly [number, number])[]
  /** Max `|Δy|` between the raw per-column measurement and this stored
   *  (smoothed, resampled) polyline, in SHIPPED PX (not normalized —
   *  `placeArtCorridor` scales it). Small by construction: the points ARE
   *  the measurement, not an approximation of it. */
  readonly residual: number
  /** Narrowest opaque-column run length within the traceable span, as a
   *  fraction of the height (task 8.7/8.8: a channel stroked at the
   *  median thickness pokes out past the drawn body at a real trough of
   *  the wave, so this is the minimum, not the median). */
  readonly thickness: number
  /** The traceable span's start/end, as fractions of the width. Equal to
   *  `points[0][0]`/`points.at(-1)[0]`. */
  readonly traceFrom: number
  readonly traceTo: number
}

/**
 * Hand-copied from the rebuilt `manifest.json` (`fix-snakes-true-alignment`),
 * the way every literal in `assets.ts`/`backdrops.ts` already is. Guarded
 * against drift by `detective/artManifest.test.ts`.
 */
export const DRAWN_SPINE: Readonly<Record<'snakeSmall' | 'snakeMedium' | 'snakeLarge', DrawnSpine>> = {
  snakeSmall: {
    mid: 0.5010499852114759,
    points: [
      [0.22083333333333333, 0.6632653061224489], [0.2375, 0.6496598639455782], [0.25416666666666665, 0.6173469387755102],
      [0.2708333333333333, 0.5714285714285714], [0.2875, 0.5187074829931974], [0.30416666666666664, 0.4659863945578231],
      [0.32083333333333336, 0.40986394557823125], [0.3375, 0.3537414965986394], [0.3541666666666667, 0.3112244897959184],
      [0.37083333333333335, 0.2772108843537415], [0.3875, 0.2602040816326531], [0.4041666666666667, 0.26870748299319724],
      [0.42083333333333334, 0.2976190476190476], [0.4375, 0.3469387755102041], [0.45416666666666666, 0.41156462585034015],
      [0.4708333333333333, 0.47959183673469385], [0.4875, 0.54421768707483], [0.5041666666666667, 0.6156462585034014],
      [0.5208333333333334, 0.6785714285714286], [0.5375, 0.7176870748299319], [0.5541666666666667, 0.738095238095238],
      [0.5708333333333333, 0.7346938775510204], [0.5875, 0.7193877551020408], [0.6041666666666666, 0.6836734693877551],
      [0.6208333333333333, 0.6326530612244898], [0.6375, 0.5748299319727891], [0.6541666666666667, 0.5119047619047619],
      [0.6708333333333333, 0.45578231292517], [0.6875, 0.3962585034013606], [0.7041666666666667, 0.3435374149659864],
      [0.7208333333333333, 0.30272108843537415], [0.7375, 0.2857142857142857], [0.7541666666666667, 0.2857142857142857],
      [0.7708333333333334, 0.3112244897959184], [0.7875, 0.3520408163265306], [0.8041666666666667, 0.41156462585034015],
      [0.8208333333333333, 0.47619047619047616], [0.8375, 0.5408163265306123], [0.8541666666666666, 0.6003401360544218],
      [0.8708333333333333, 0.6496598639455782], [0.8875, 0.6819727891156462], [0.9041666666666667, 0.6938775510204082],
      [0.9208333333333333, 0.685374149659864], [0.9375, 0.6581632653061225],
    ],
    residual: 0.75,
    thickness: 0.4897959183673469,
    traceFrom: 0.22083333333333333,
    traceTo: 0.9375,
  },
  snakeMedium: {
    mid: 0.6267300194931774,
    points: [
      [0.21747967479674796, 0.5833333333333334], [0.23369467028003613, 0.664977257959714], [0.2499096657633243, 0.7277452891487979],
      [0.2661246612466125, 0.7659844054580895], [0.2823396567299006, 0.7893437296946069], [0.2985546522131888, 0.7954840805717999],
      [0.314769647696477, 0.7882066276803119], [0.3309846431797651, 0.7609161793372321], [0.3471996386630533, 0.7203378817413905],
      [0.3634146341463415, 0.6681286549707601], [0.3796296296296296, 0.6138726445743989], [0.39584462511291774, 0.5573424301494478],
      [0.412059620596206, 0.49863547758284593], [0.42827461607949413, 0.44948018193632233], [0.4444896115627823, 0.4146523716699155],
      [0.46070460704607047, 0.3991228070175439], [0.4769196025293586, 0.4024691358024691], [0.49313459801264675, 0.4287199480181936],
      [0.5093495934959349, 0.47660818713450287], [0.5255645889792231, 0.531384015594542], [0.5417795844625113, 0.5969785575048732],
      [0.5579945799457994, 0.6625730994152044], [0.5742095754290876, 0.7252111760883688], [0.5904245709123758, 0.7667641325536062],
      [0.606639566395664, 0.7893762183235868], [0.6228545618789522, 0.7982456140350878], [0.6390695573622402, 0.7844704353476284],
      [0.6552845528455284, 0.756140350877193], [0.6714995483288166, 0.7077647823261858], [0.687714543812105, 0.6479857050032485],
      [0.7039295392953929, 0.5867446393762185], [0.7201445347786811, 0.5328135152696555], [0.7363595302619693, 0.4826510721247562],
      [0.7525745257452574, 0.4509746588693957], [0.7687895212285456, 0.44298245614035087], [0.7850045167118338, 0.4582521117608837],
      [0.8012195121951219, 0.49385964912280694], [0.8174345076784101, 0.5436972059779075], [0.8336495031616983, 0.6020142949967512],
      [0.8498644986449865, 0.6601364522417154], [0.8660794941282746, 0.7066276803118907], [0.8822944896115628, 0.7372319688109162],
      [0.898509485094851, 0.7456140350877193], [0.9147244805781392, 0.7337881741390513], [0.9309394760614272, 0.7016569200779729],
      [0.9471544715447154, 0.6535087719298246],
    ],
    residual: 0.9543794490869715,
    thickness: 0.3508771929824561,
    traceFrom: 0.21747967479674796,
    traceTo: 0.9471544715447154,
  },
  snakeLarge: {
    mid: 0.5351859649122807,
    points: [
      [0.197, 0.5289473684210526], [0.2129148936170213, 0.604012691302725], [0.22882978723404254, 0.666368047779022],
      [0.24474468085106382, 0.6936356849570736], [0.26065957446808513, 0.6924038820455394], [0.2765744680851064, 0.6623926838372527],
      [0.2924893617021277, 0.6070548712206046], [0.30840425531914895, 0.5434863755132513], [0.3243191489361702, 0.47930197835013055],
      [0.3402340425531915, 0.4204367301231803], [0.35614893617021276, 0.3839492347891004], [0.37206382978723407, 0.3736842105263158],
      [0.3879787234042553, 0.3824374766703994], [0.40389361702127663, 0.4225270623366928], [0.4198085106382979, 0.48337066069428897],
      [0.4357234042553192, 0.542889137737962], [0.45163829787234044, 0.6124486748786862], [0.4675531914893617, 0.6672452407614782],
      [0.483468085106383, 0.6947368421052632], [0.4993829787234042, 0.6952780888391191], [0.5152978723404256, 0.6707913400522583],
      [0.5312127659574468, 0.6227510265024264], [0.5471276595744681, 0.5564576334453153], [0.5630425531914893, 0.49016424038820466],
      [0.5789574468085107, 0.42646509891750645], [0.5948723404255319, 0.38016050765210907], [0.6107872340425532, 0.3600223964165733],
      [0.6267021276595744, 0.36377379619260913], [0.6426170212765958, 0.39109742441209416], [0.658531914893617, 0.44572601717058596],
      [0.6744468085106383, 0.5120940649496082], [0.6903617021276596, 0.5752706233669279], [0.7062765957446809, 0.6395670026129153],
      [0.7221914893617021, 0.6915640164240388], [0.7381063829787234, 0.7157894736842105], [0.7540212765957447, 0.7087532661440836],
      [0.769936170212766, 0.6738521836506158], [0.7858510638297872, 0.6130645763344532], [0.8017659574468085, 0.5483949234789104],
      [0.8176808510638298, 0.48238148562896604], [0.8335957446808511, 0.4186076894363567], [0.8495106382978723, 0.3850690556177679],
      [0.8654255319148936, 0.3749346771183277], [0.8813404255319149, 0.3924038820455394], [0.8972553191489362, 0.43773796192609205],
      [0.9131702127659574, 0.5026502426278462], [0.9290851063829787, 0.5687196715192233], [0.945, 0.6210526315789474],
    ],
    residual: 0.9140070921985739,
    thickness: 0.4842105263157895,
    traceFrom: 0.197,
    traceTo: 0.945,
  },
}

/** An art corridor's piece, as a level authors it. Coordinates are in the
 *  SAME pre-centring space every other path generator's parameters live in
 *  (`buildLevel.ts`'s `layOutPaths` centres everything together via `tx`). */
export interface ArtCorridorPiece {
  art: ArtImage
  spine: keyof typeof DRAWN_SPINE
  /** The ONLY size knob: the cutout's rendered WIDTH in viewBox units. The
   *  height, the thickness, the amplitude and the corridor all follow from
   *  it, so seriation is one number per snake (design.md §3.1). */
  span: number
  /** Where the fitted centreline's midline sits: `at.y` is the viewBox y the
   *  spine's fitted `mid` maps to; `at.x` is the piece's own horizontal
   *  CENTRE (the box has no separate x-anchor fraction the way `mid` gives
   *  one for y, so its centre is the natural single point). */
  at: { x: number; y: number }
  /** Degrees about the piece's own centre, applied to the `<image>` AND to
   *  the path, from this one field. Absent = 0. */
  rotate?: number
}

export interface ArtCorridorPlacement {
  /** What the `<image>` is spread onto — unrotated; rotation is a live
   *  `transform="rotate(…)"` about {@link ArtCorridorPlacement.pivot}. */
  readonly box: ArtBox
  readonly rotate: number
  readonly pivot: { x: number; y: number }
  /** `spinePolyline`'s emitted `d`, already rotated and already translated. */
  readonly d: string
  /** The drawn body's narrowest thickness within the traceable span, viewBox
   *  units. */
  readonly thickness: number
  /** The stored polyline's own residual against the raw measurement,
   *  viewBox units (`residual * span / art.w`). */
  readonly residual: number
}

/**
 * The `<image>` box and the path that runs down the middle of it, from ONE
 * derivation. The renderer takes `box`/`rotate`/`pivot`; the level takes
 * `d`; `catalog.test.ts` takes `thickness`/`residual`. A test that
 * recomputed the placement independently would prove nothing about what is
 * drawn — so nothing recomputes it.
 *
 * `tx` is the SAME horizontal centring translation `layOutPaths` computed
 * for every path on the sheet (`buildLevel.ts` §1.4's own trap): applying it
 * here, after rotation, is what keeps the picture and the corridor from
 * ever disagreeing about where the level sits.
 */
export function placeArtCorridor(piece: ArtCorridorPiece, tx: number): ArtCorridorPlacement {
  const spine = DRAWN_SPINE[piece.spine]
  const { art, span } = piece
  const height = (span * art.h) / art.w
  const rotate = piece.rotate ?? 0

  // The unrotated, pre-`tx` box and pivot (rotation is about the piece's OWN
  // centre).
  const box0: ArtBox = { x: piece.at.x - span / 2, y: piece.at.y - spine.mid * height, width: span, height }
  const pivot0 = { x: box0.x + box0.width / 2, y: box0.y + box0.height / 2 }

  // The unrotated, un-translated centreline, over the MEASURED domain
  // [traceFrom, traceTo] of the box — `spine.points` already starts and ends
  // exactly there (no separate x0/width chain to drift out of sync with it,
  // the anchor bug this replaces).
  const points = spine.points.map(([xFrac, yFrac]) => ({
    x: box0.x + xFrac * span,
    y: box0.y + yFrac * height,
  }))
  const localD = spinePolyline(points)

  // ONE transform carries both the rotation (about the piece's own centre)
  // and the translation (the sheet's centring `tx`) — `scale → rotate →
  // translate`, `paths.ts`'s own order.
  const d = transformPath(localD, { rotate, pivot: pivot0, translate: { x: tx, y: 0 } })

  const box: ArtBox = { ...box0, x: box0.x + tx }
  const pivot = { x: pivot0.x + tx, y: pivot0.y }

  return {
    box,
    rotate,
    pivot,
    d,
    thickness: spine.thickness * height,
    residual: (spine.residual * span) / art.w,
  }
}
