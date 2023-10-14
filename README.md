Slight Stream Archiver

======

Introduction
----

A javascript library that can stream zip files requires a WASM environment. It wrap [zip-rs](https://github.com/zip-rs/zip) to implement streaming archive.

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