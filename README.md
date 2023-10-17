Slight Stream Archiver
======

![Main](https://github.com/hpp2334/slight-stream-archiver/actions/workflows/main.yml/badge.svg)
![Statements](https://img.shields.io/badge/statements-79.5%25-red.svg?style=flat)
[![npm version](https://badge.fury.io/js/slight-stream-archiver.svg)](https://badge.fury.io/js/slight-stream-archiver)

Introduction
----

A javascript library that can stream zip files requires a WASM environment. It wraps [zip-rs](https://github.com/zip-rs/zip) to implement streaming archives.

Currently, zip is supported only.

Installation
----

```shell
npm i slight-stream-archiver
```

Example
----

```ts
import { ensureWasmLoaded, StreamZip, createJsonStringifyDataGenerator, createStringDataGenerator } from 'slight-stream-archiver'
async function work() {
    // Initial WASM
    await ensureWasmLoaded()

    const zip = new StreamZip()
    // add a.txt
    zip.addFile('READMD.md', createStringDataGenerator('Hello World'))
    // add folder "src"
    zip.addFolder('src')
    // add file "/src/package.json"
    zip.addFile('src/package.json', createJsonStringifyDataGenerator({
        name: "playground"
    }))
    // add file "/src/index.js"
    zip.addFile('src/index.js', createStringDataGenerator("const a = 1;"))

    // archive
    const buf = zip.finish()

    // ...
}
```

License
----
MIT