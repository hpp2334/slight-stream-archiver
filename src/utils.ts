import { IDataGenerator } from "./type";

export const createStringDataGenerator = (str: string): IDataGenerator => {
    let hasNext = true;
    return {
        next() {
            if (hasNext) {
                hasNext = false;
                return new TextEncoder().encode(str)
            }
            return null;
        }
    }
}

export const createBytesDataGenerator = (bytes: Uint8Array): IDataGenerator => {
    let hasNext = true;
    return {
        next() {
            if (hasNext) {
                hasNext = false;
                return bytes;
            }
            return null;
        }
    }
}

export const createJsonStringifyDataGenerator = (obj: any): IDataGenerator => {
    return new JsonStringifyDataGenerator(obj)
}

function isNotNullObject(x: any) {
    return x !== null && typeof x === 'object'
}

interface JsonStringifyStackItem {
    obj: any,
    notNullObject: boolean,
    isArray: boolean,
    keys: string[],
    index: number
}

class JsonStringifyDataGenerator implements IDataGenerator {
    private _stack: Array<JsonStringifyStackItem> = []
    private _objectStackSet = new WeakSet()
    private textEncoder = new TextEncoder()

    public constructor(obj: any) {
        if (obj === undefined) {
            throw Error("cannot stringify undefined")
        }
        this.pushStackObject(obj)
    }

    public next = (): Uint8Array | null => {
        if (this._stack.length === 0) {
            return null;
        }
        const curr = this._stack[this._stack.length - 1]
        if (!curr.notNullObject) {
            this.popStack()
            return this.textEncoder.encode(JSON.stringify(curr.obj ?? null))
        }
        if (curr.keys.length === 0) {
            this.popStack()
            return this.textEncoder.encode(curr.isArray ? "[]" : "{}");
        }
        const index = curr.index++
        if (index >= curr.keys.length) {
            this.popStack()
            return this.textEncoder.encode(curr.isArray ? ']' : '}')
        }
        const key = curr.keys[index]
        const nextObject = curr.obj[key]
        this.pushStackObject(nextObject)

        if (!curr.isArray) {
            const jsonKey = JSON.stringify(key)
            if (index == 0) {
                return this.textEncoder.encode(`{${jsonKey}:`);
            } else {
                return this.textEncoder.encode(`,${jsonKey}:`);
            }
        } else {
            if (index == 0) {
                return this.textEncoder.encode('[');
            } else {
                return this.textEncoder.encode(',');
            }
        }
    }

    private pushStackObject = (obj: any) => {
        const notNullObject = isNotNullObject(obj)
        if (notNullObject) {
            if (this._objectStackSet.has(obj)) {
                throw Error('cyclic object detected');
            }
            this._objectStackSet.add(obj)
        }
        const isArray = Array.isArray(obj)
        this._stack.push({
            obj,
            notNullObject,
            isArray,
            keys: notNullObject ? (isArray ? Object.keys(obj) : Object.keys(obj).filter(key => obj[key] !== undefined)) : [],
            index: 0,
        })
    }

    private popStack = () => {
        const curr = this._stack[this._stack.length - 1]
        this._stack.pop()
        if (curr.notNullObject) {
            this._objectStackSet.delete(curr.obj)
        }
    }
}