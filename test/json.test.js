import chai from 'chai'
import chaiBytes from 'chai-bytes'
const { expect } = chai.use(chaiBytes)

import { describe } from './test-suites'
import { ensureWasmLoaded, StreamZip, createJsonStringifyDataGenerator, createStringDataGenerator } from '../dist'
import JsZip from 'jszip'
import Chance from 'chance'
import { randomZip, randomValue } from './utils'

async function testSimpleJson(obj, expected, seed) {
    await ensureWasmLoaded()

    const zip = randomZip(seed)
    zip.addFile('a.txt', createJsonStringifyDataGenerator(obj, {
        threshold: 20 * 1000 * 1000
    }))
    const buf = zip.finish()

    const unwrapZip = await JsZip.loadAsync(buf)
    const aTxt = unwrapZip.file('a.txt')
    expect(aTxt).to.not.be.null;
    const data = await aTxt.async('string');
    expect(data).to.equal(expected);
}


describe('json({})', async () => {
    await testSimpleJson({}, '{}')
})

describe('json(1)', async () => {
    await testSimpleJson(1, '1')
})

describe('json(null)', async () => {
    await testSimpleJson(null, "null")
})

describe('json([null,null])', async () => {
    await testSimpleJson([null, null], "[null,null]")
})

describe('json([null,undefined])', async () => {
    await testSimpleJson([null, undefined], "[null,null]")
})

describe('json("H")', async () => {
    await testSimpleJson("H", '"H"')
})

describe('json("{x: undefined}")', async () => {
    await testSimpleJson({ x: undefined }, '{}')
})

describe('json({x:1})', async () => {
    await testSimpleJson({ x: 1 }, '{"x":1}')
})

describe('json({x:[1,2,"a"]})', async () => {
    await testSimpleJson({ x: [1, 2, "a"] }, '{"x":[1,2,"a"]}')
})

describe('json({x:1,y:"A"})', async () => {
    await testSimpleJson({ x: 1, y: "A" }, '{"x":1,"y":"A"}')
})

describe('json({a:{x:1},b:{x:1}})', async () => {
    const o = { x: 1 }
    await testSimpleJson({ a: o, b: o }, '{"a":{"x":1},"b":{"x":1}}')
})

describe('json(loop), expct throw', async () => {
    const o = { x: 1 }
    o.o = o

    let catchError = false;
    try {
        await testSimpleJson(o, null)
    } catch (err) {
        catchError = true;
    }

    expect(catchError).to.be.true;
})


for (let caseNum = 0; caseNum < 10; caseNum++) {
    const seed = Date.now() + caseNum
    describe(`Json Archive Perf FuzzTest [${seed}] ${caseNum + 1}`, async () => {
        const o = randomValue(seed, 5, 21, 4, true)
        const s = JSON.stringify(o)
        await testSimpleJson(o, s, seed)
    })
}


for (let caseNum = 0; caseNum < 5000; caseNum++) {
    const seed = Date.now() + caseNum
    describe(`Json Archive FuzzTest [${seed}] ${caseNum + 1}`, async () => {
        const o = randomValue(seed, 0, 4, 100, false)
        await testSimpleJson(o, JSON.stringify(o))
    })
}
