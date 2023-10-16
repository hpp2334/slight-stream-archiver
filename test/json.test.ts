import { ensureWasmLoaded, createJsonStringifyDataGenerator, createStringDataGenerator } from '../dist'
import { randomZip, randomValue } from './utils'
import { expect, JsZip } from '../test-dependencies/dist'

async function testSimpleJson(obj: any, expected: string | null, seed?: number) {
    await ensureWasmLoaded()

    const zip = randomZip(seed)
    zip.addFile('a.txt', createJsonStringifyDataGenerator(obj, {
        threshold: 20 * 1000 * 1000
    }))
    const buf = zip.finish()

    const unwrapZip = await JsZip.loadAsync(buf)
    const aTxt = unwrapZip.file('a.txt')
    expect(aTxt).to.not.be.null;
    const data = await aTxt!.async('string');
    expect(data).to.equal(expected);
}


it('json({})', async () => {
    await testSimpleJson({}, '{}')
})

it('json(1)', async () => {
    await testSimpleJson(1, '1')
})

it('json(null)', async () => {
    await testSimpleJson(null, "null")
})

it('json([null,null])', async () => {
    await testSimpleJson([null, null], "[null,null]")
})

it('json([null,undefined])', async () => {
    await testSimpleJson([null, undefined], "[null,null]")
})

it('json("H")', async () => {
    await testSimpleJson("H", '"H"')
})

it('json("{x: undefined}")', async () => {
    await testSimpleJson({ x: undefined }, '{}')
})

it('json({x:1})', async () => {
    await testSimpleJson({ x: 1 }, '{"x":1}')
})

it('json({x:[1,2,"a"]})', async () => {
    await testSimpleJson({ x: [1, 2, "a"] }, '{"x":[1,2,"a"]}')
})

it('json({x:1,y:"A"})', async () => {
    await testSimpleJson({ x: 1, y: "A" }, '{"x":1,"y":"A"}')
})

it('json({a:{x:1},b:{x:1}})', async () => {
    const o = { x: 1 }
    await testSimpleJson({ a: o, b: o }, '{"a":{"x":1},"b":{"x":1}}')
})

it('json(loop), expct throw', async () => {
    const o: any = { x: 1 }
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
    it(`Json Archive Perf FuzzTest [${seed}] ${caseNum + 1}`, async () => {
        const o = randomValue(seed, 5, 19, 4, true)
        const s = JSON.stringify(o)
        await testSimpleJson(o, s, seed)
    }).timeout(90 * 1000)
}


for (let caseNum = 0; caseNum < 5000; caseNum++) {
    const seed = Date.now() + caseNum
    it(`Json Archive FuzzTest [${seed}] ${caseNum + 1}`, async () => {
        const o = randomValue(seed, 0, 4, 100, false)
        await testSimpleJson(o, JSON.stringify(o))
    })
}
