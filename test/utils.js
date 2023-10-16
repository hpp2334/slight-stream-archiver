
import { ensureWasmLoaded, StreamZip, createJsonStringifyDataGenerator, createStringDataGenerator } from '../dist'
import Chance from 'chance'

export function randomZip(seed) {
    if (!seed) {
        return new StreamZip();
    }
    const change = new Chance(seed)

    const compressionMethod = change.bool() ? 'DEFLATE' : 'STORE'
    const compressionLevel = compressionMethod === 'DEFLATE' ? change.integer({ min: 1, max: 9 }) : undefined


    return new StreamZip({
        compressionMethod,
        compressionLevel
    })
}


export function randomValue(seed, minRange, maxRange, maxDepth, startsWithObject) {
    const gen = new Chance(seed)
    const prevGenArrayOrObject = []

    function randomObject(detph) {
        const n = gen.integer({ min: minRange, max: maxRange })
        const x = {}

        for (let j = 0; j < n; j++) {
            const usePrev = prevGenArrayOrObject.length && gen.floating({ min: 0, max: 1 }) < 0.2
            if (usePrev) {
                x[gen.string()] = prevGenArrayOrObject[gen.integer({ min: 0, max: prevGenArrayOrObject.length - 1 })]
            } else {
                x[gen.string()] = randomValueImpl(false, detph + 1)
            }
        }
        prevGenArrayOrObject.push(x)
        return x;
    }

    function randomArray(detph) {
        const n = gen.integer({ min: minRange, max: maxRange })
        const x = []

        for (let j = 0; j < n; j++) {
            const usePrev = prevGenArrayOrObject.length && gen.floating({ min: 0, max: 1 }) < 0.2
            if (usePrev) {
                x.push(prevGenArrayOrObject[gen.integer({ min: 0, max: prevGenArrayOrObject.length - 1 })])
            } else {
                x.push(randomValueImpl(false, detph + 1))
            }
        }
        prevGenArrayOrObject.push(x)
        return x;
    }

    function randomValueImpl(isRoot, detph) {
        const v = (() => {
            if (isRoot) {
                if (startsWithObject) {
                    return gen.integer({ min: 6, max: 7 })
                }
                return gen.integer({ min: 1, max: 7 })
            }
            if (detph >= maxDepth) {
                return gen.integer({ min: 0, max: 5 })
            }
            return gen.integer({ min: 0, max: 7 })
        })()

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
                return randomArray(detph)
            case 7:
                return randomObject(detph)
        }
    }

    return randomValueImpl(true, 0)
}