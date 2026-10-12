import sharp from 'sharp'
import { ShapeUtils, Vector2 } from 'three'

const size = 512
const threshold = 145
const { data } = await sharp('public/rovera-logo.png')
  .resize(size, size, { fit: 'fill' })
  .extractChannel('alpha')
  .raw()
  .toBuffer({ resolveWithObject: true })
const inside = (x, y) => x >= 0 && y >= 0 && x < size && y < size && data[y * size + x] >= threshold
const edges = []
const outgoing = new Map()
function edge(x1, y1, x2, y2, direction) {
  const index = edges.length
  edges.push({ x1, y1, x2, y2, direction, used: false })
  const key = `${x1},${y1}`
  if (!outgoing.has(key)) outgoing.set(key, [])
  outgoing.get(key).push(index)
}
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (inside(x, y)) {
  if (!inside(x, y - 1)) edge(x, y, x + 1, y, 0)
  if (!inside(x + 1, y)) edge(x + 1, y, x + 1, y + 1, 1)
  if (!inside(x, y + 1)) edge(x + 1, y + 1, x, y + 1, 2)
  if (!inside(x - 1, y)) edge(x, y + 1, x, y, 3)
}
const loops = []
for (let startIndex = 0; startIndex < edges.length; startIndex++) {
  if (edges[startIndex].used) continue
  const start = edges[startIndex]
  let current = startIndex
  const points = []
  for (let guard = 0; guard <= edges.length; guard++) {
    const item = edges[current]
    if (item.used) break
    item.used = true
    points.push([item.x1, item.y1])
    if (item.x2 === start.x1 && item.y2 === start.y1) break
    const candidates = (outgoing.get(`${item.x2},${item.y2}`) || []).filter(i => !edges[i].used)
    if (!candidates.length) break
    const preference = [1, 0, 3, 2].map(turn => (item.direction + turn) % 4)
    current = candidates.sort((a, b) => preference.indexOf(edges[a].direction) - preference.indexOf(edges[b].direction))[0]
  }
  if (points.length >= 8) loops.push(points)
}
function simplify(points, tolerance = 1.2) {
  const open = [...points, points[0]]
  const keep = new Set([0, open.length - 1])
  const stack = [[0, open.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()
    let maxDistance = tolerance, farthest = -1
    const [ax, ay] = open[first], [bx, by] = open[last]
    const dx = bx - ax, dy = by - ay, lengthSq = dx * dx + dy * dy
    for (let i = first + 1; i < last; i++) {
      const [x, y] = open[i]
      const t = lengthSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSq)) : 0
      const distance = Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
      if (distance > maxDistance) { maxDistance = distance; farthest = i }
    }
    if (farthest !== -1) { keep.add(farthest); stack.push([first, farthest], [farthest, last]) }
  }
  return [...keep].sort((a, b) => a - b).slice(0, -1).map(i => open[i])
}
function area(loop) {
  let result = 0
  for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length]; result += a[0] * b[1] - b[0] * a[1] }
  return result / 2
}
const simplified = loops.map((loop) => simplify(loop)).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))
const outer = simplified[0]
const holes = simplified.slice(1)
if (!outer) throw new Error('Logo trace produced no usable outline')
const bbox = outer.reduce((box, [x, y]) => [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)], [Infinity, Infinity, -Infinity, -Infinity])
const scale = 4.2 / (bbox[2] - bbox[0])
const point = ([x, y]) => [(x - (bbox[0] + bbox[2]) / 2) * scale, ((bbox[1] + bbox[3]) / 2 - y) * scale]
const normalized = [outer, ...holes].map(loop => loop.map(point))
const vectors = normalized.map(loop => loop.map(([x, y]) => new Vector2(x, y)))
const triangles = ShapeUtils.triangulateShape(vectors[0], vectors.slice(1))
const vertices = vectors.flat().map(({ x, y }) => [Number(x.toFixed(5)), Number(y.toFixed(5))])
const traced = { size, threshold, bbox, contours: simplified.map(loop => loop.length), signedAreas: simplified.map(area), vertices, triangles, loops: normalized }
console.log(JSON.stringify(process.argv.includes('--json') ? traced : { ...traced, vertices: undefined, triangles: undefined, loops: undefined }))
