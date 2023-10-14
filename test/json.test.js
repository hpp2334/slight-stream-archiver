import chai from 'chai'
import chaiBytes from 'chai-bytes'
const { expect } = chai.use(chaiBytes)

import { describe } from './test-suites'
import { StreamZip, createBytesDataGenerator, createJsonStringifyDataGenerator, createStringDataGenerator } from '../dist'
import JsZip from 'jszip'
import Chance from 'chance'

async function testSimpleJson(obj, expected) {
    const zip = new StreamZip()
    zip.addFile('a.txt', createJsonStringifyDataGenerator(obj))
    const buf = zip.finish()

    const unwrapZip = await JsZip.loadAsync(buf)
    const aTxt = unwrapZip.file('a.txt')
    expect(aTxt).to.not.be.null;
    const data = await aTxt.async('string');
    expect(data).to.equal(expected);
}

function randomValue(seed) {
    const gen = new Chance(seed)
    const prevGenArrayOrObject = []

    function randomObject() {
        const n = gen.integer({ min: 0, max: 5 })
        const x = {}

        for (let j = 0; j < n; j++) {
            const usePrev = prevGenArrayOrObject.length && gen.floating({ min: 0, max: 1 }) < 0.2
            if (usePrev) {
                x[gen.string()] = prevGenArrayOrObject[gen.integer({ min: 0, max: prevGenArrayOrObject.length - 1 })]
            } else {
                x[gen.string()] = randomValueImpl()
            }
        }
        prevGenArrayOrObject.push(x)
        return x;
    }

    function randomArray() {
        const n = gen.integer({ min: 0, max: 5 })
        const x = []

        for (let j = 0; j < n; j++) {
            const usePrev = prevGenArrayOrObject.length && gen.floating({ min: 0, max: 1 }) < 0.2
            if (usePrev) {
                x.push(prevGenArrayOrObject[gen.integer({ min: 0, max: prevGenArrayOrObject.length - 1 })])
            } else {
                x.push(randomValueImpl())
            }
        }
        prevGenArrayOrObject.push(x)
        return x;
    }

    function randomValueImpl(isRoot) {
        const v = gen.integer({ min: isRoot ? 1 : 0, max: 7 })
        switch (v) {
            case 0:
                return undefined
            case 1:
                return null
            case 2:
                return gen.floating()
            case 3:
                return gen.string()
            case 4:
                return gen.bool()
            case 5:
                return gen.integer()
            case 6:
                return randomArray()
            case 7:
                return randomObject()
        }
    }

    return randomValueImpl(true)
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

for (let caseNum = 0; caseNum < 5000; caseNum++) {
    const seed = Date.now() + caseNum
    describe(`Json Archive FuzzTest [${seed}] ${caseNum + 1}`, async () => {
        const o = randomValue(seed)
        await testSimpleJson(o, JSON.stringify(o))
    })
}
