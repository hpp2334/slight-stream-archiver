import chai from 'chai'
import chaiBytes from 'chai-bytes'
const { expect } = chai.use(chaiBytes)

import { describe } from './test-suites'
import { ensureWasmLoaded, StreamZip, createBytesDataGenerator, createStringDataGenerator } from '../dist'
import JsZip from 'jszip'
import Chance from 'chance'

describe('Zip a.txt "Hello World"', async () => {
    await ensureWasmLoaded();

    const zip = new StreamZip()
    zip.addFile('a.txt', createStringDataGenerator('Hello World'))
    const buf = zip.finish()

    const unwrapZip = await JsZip.loadAsync(buf)
    const aTxt = unwrapZip.file('a.txt')
    expect(aTxt).to.not.be.null;
    const data = await aTxt.async('string');
    expect(data).to.equal('Hello World');
})

describe('Zip DEFLATE level=7', async () => {
    await ensureWasmLoaded();

    const zip = new StreamZip({
        compressionMethod: 'DEFLATE',
        compressionLevel: 7,
    })
    zip.addFile('a.txt', createStringDataGenerator('Hello World'))
    const buf = zip.finish()

    const unwrapZip = await JsZip.loadAsync(buf)
    const aTxt = unwrapZip.file('a.txt')
    expect(aTxt).to.not.be.null;
    const data = await aTxt.async('string');
    expect(data).to.equal('Hello World');
})

describe('Zip b.bin b"01234"', async () => {
    await ensureWasmLoaded();

    const zip = new StreamZip()
    zip.addFile('b.bin', createBytesDataGenerator(new Uint8Array([0, 1, 2, 3, 4])))
    const buf = zip.finish()

    const unwrapZip = await JsZip.loadAsync(buf)
    {
        const bBin = unwrapZip.file('b.bin')
        expect(bBin).to.not.be.null;
        const data = await bBin.async('uint8array')
        expect(data).have.length(5)
        expect(data).to.equalBytes([0, 1, 2, 3, 4])
    }
})

describe('Zip a.txt "Hello World", b.bin b"01234"', async () => {
    await ensureWasmLoaded();

    const zip = new StreamZip()
    zip.addFile('a.txt', createStringDataGenerator('Hello World'))
    zip.addFile('b.bin', createBytesDataGenerator(new Uint8Array([0, 1, 2, 3, 4])))
    const buf = zip.finish()

    const unwrapZip = await JsZip.loadAsync(buf)
    {
        const aTxt = unwrapZip.file('a.txt')
        expect(aTxt).to.not.be.null;
        const data = await aTxt.async('string');
        expect(data).to.equal('Hello World');
    }
    {
        const bBin = unwrapZip.file('b.bin')
        expect(bBin).to.not.be.null;
        const data = await bBin.async('uint8array')
        expect(data).have.length(5)
        expect(data).to.equalBytes([0, 1, 2, 3, 4])
    }
})


describe('Zip a.txt "Hello World", f1/b.bin b"01234"', async () => {
    await ensureWasmLoaded();

    const zip = new StreamZip()
    zip.addFile('a.txt', createStringDataGenerator('Hello World'))
    zip.addFolder('f1')
    zip.addFile('f1/b.bin', createBytesDataGenerator(new Uint8Array([0, 1, 2, 3, 4])))
    const buf = zip.finish()

    const unwrapZip = await JsZip.loadAsync(buf)
    {
        const aTxt = unwrapZip.file('a.txt')
        expect(aTxt).to.not.be.null;
        const data = await aTxt.async('string');
        expect(data).to.equal('Hello World');
    }
    {
        const entry = unwrapZip.folder('f1')
        expect(entry).to.not.be.null
        const bBin = entry.file('b.bin')
        expect(bBin).to.not.be.null;
        const data = await bBin.async('uint8array')
        expect(data).have.length(5)
        expect(data).to.equalBytes([0, 1, 2, 3, 4])
    }
})

for (let caseNum = 0; caseNum < 5000; caseNum++) {
    const seed = Date.now() + caseNum
    const gen = new Chance(seed)

    const ops = []
    let fileId = 0
    const work = (root, isDir) => {
        const fileName = "file_" + (++fileId)
        const path = root + '/' + fileName
        const data = gen.string()
        ops.push([path, data, isDir])

        if (isDir && gen.floating({ min: 0, max: 1 }) < 0.3) {
            const num = gen.integer({ min: 0, max: 4 })

            for (let i = 0; i < num; i++) {
                work(path, gen.bool())
            }
        }
    }
    [0, 1, 2, 3].forEach(() => work('', gen.bool()))

    describe(`Archiver FuzzTest [${seed}] ${caseNum + 1}`, async () => {
        await ensureWasmLoaded();

        const zip = new StreamZip()
        for (const [path, data, isDir] of ops) {
            if (isDir) {
                zip.addFolder(path)
            } else {
                zip.addFile(path, createStringDataGenerator(data))
            }
        }
        const buf = zip.finish()

        const unwrapZip = await JsZip.loadAsync(buf)
        for (const [path, rawData, isDir] of ops) {
            if (isDir) {
                const folder = unwrapZip.folder(path)
                expect(folder).not.be.null;
            } else {
                const entry = unwrapZip.file(path);
                expect(entry).not.be.null;
                const data = await entry.async('string');
                expect(data).to.eq(rawData);
            }
        }
    })
}