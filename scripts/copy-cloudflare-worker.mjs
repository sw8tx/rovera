import { cpSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const source = resolve('cloudflare/_worker.js')
const target = resolve('out/_worker.js')

mkdirSync(dirname(target), { recursive: true })
cpSync(source, target)
console.log(`Copied ${source} to ${target}`)
