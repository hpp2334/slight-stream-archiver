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

export const createJsonStringifyDataGenerator = (obj: any, options?: JsonStringifyDataGeneratorOptions): IDataGenerator => {
    return new JsonStringifyDataGenerator(obj, options)
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

export interface JsonStringifyDataGeneratorOptions {
    threshold: number;
}

class JsonStringifyDataGenerator implements IDataGenerator {
    private _stack: Array<JsonStringifyStackItem> = []
    private _objectStackSet = new WeakSet()
    private buf: string = ''
    private threshold: number;

    public constructor(obj: any, options?: JsonStringifyDataGeneratorOptions) {
        if (obj === undefined) {
            throw Error("cannot stringify undefined")
        }
        // 1 MB
        this.threshold = options?.threshold ?? (1 << 20);
        if (this.threshold <= 0) {
            throw Error(`threshold should not less or equal to zero`)
        }
        this.pushStackObject(obj)
    }

    public next = (): Uint8Array | null => {
        while (true) {
            if (this.buf.length >= this.threshold) {
                break;
            }
            if (this._stack.length === 0) {
                break;
            }
            const curr = this._stack[this._stack.length - 1]
            if (!curr.notNullObject) {
                this.popStack()
                this.buf += JSON.stringify(curr.obj ?? null)
                continue;
            }
            if (curr.keys.length === 0) {
                this.popStack()
                this.buf += (curr.isArray ? "[]" : "{}");
                continue;
            }
            const index = curr.index++
            if (index >= curr.keys.length) {
                this.popStack()
                this.buf += (curr.isArray ? ']' : '}')
                continue;
            }
            const key = curr.keys[index]
            const nextObject = curr.obj[key]
            this.pushStackObject(nextObject)

            if (!curr.isArray) {
                const jsonKey = JSON.stringify(key)
                if (index == 0) {
                    this.buf += `{${jsonKey}:`
                    continue;
                } else {
                    this.buf += `,${jsonKey}:`
                    continue;
                }
            } else {
                if (index == 0) {
                    this.buf += '['
                    continue;
                } else {
                    this.buf += ','
                    continue;
                }
            }
        }
        if (this.buf.length > 0) {
            const data = new TextEncoder().encode(this.buf);
            this.buf = ''
            return data;
        }
        return null;
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