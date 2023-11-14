import { execSync } from 'child_process'
import { cpSync } from 'fs'

execSync('pnpm run build:wasm', {
    stdio: 'inherit'
})
execSync('pnpm run build:lib', {
    stdio: 'inherit'
})
cpSync('./src/pkg', './dist/pkg', {
    recursive: true
})
