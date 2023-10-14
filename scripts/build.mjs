import { execSync } from 'child_process'
import { cpSync } from 'fs'

execSync('pnpm run build:wasm')
execSync('pnpm run build:lib')
cpSync('./src/pkg', './dist/pkg', {
    recursive: true
})
