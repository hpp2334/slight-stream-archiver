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

const enum StackItemType {
    Null /*             */ = 0b0000001,
    Undefined /*        */ = 0b0000010,
    Number  /*          */ = 0b0000100,
    String /*           */ = 0b0001000,
    Bool  /*            */ = 0b0010000,
    Array  /*           */ = 0b0100000,
    Object  /*          */ = 0b1000000,
    ArrayOrObject  /*   */ = 0b1100000,
    Native /*           */ = 0b0011111,
}

interface JsonStringifyStackItem {
    obj: any,
    type: StackItemType,
    keys: string[],
    index: number
}

export interface JsonStringifyDataGeneratorOptions {
    threshold: number;
}

function getStackItemType(x: unknown): StackItemType {
    if (x === null) {
        return StackItemType.Null;
    }
    if (x === undefined) {
        return StackItemType.Undefined;
    }
    if (typeof x === 'number') {
        return StackItemType.Number;
    }
    if (typeof x === 'string') {
        return StackItemType.String;
    }
    if (typeof x === 'boolean') {
        return StackItemType.Bool;
    }
    if (Array.isArray(x)) {
        return StackItemType.Array;
    }
    return StackItemType.Object;
}

class JsonStringifyDataGenerator implements IDataGenerator {
    private _stack: Array<JsonStringifyStackItem> = []
    private _stackTop: JsonStringifyStackItem | null = null;
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
        this.pushStackObject(obj, getStackItemType(obj))
    }

    public next = (): Uint8Array | null => {
        while (true) {
            if (this.buf.length >= this.threshold) {
                break;
            }
            if (this._stack.length === 0) {
                break;
            }
            const curr = this._stackTop
            if (curr === null) {
                throw Error(`stack empty`)
            }
            if (curr.type & StackItemType.Native) {
                this.popStack()
                this.buf += JSON.stringify(curr.obj ?? null)
                continue;
            }
            if (curr.keys.length === 0) {
                this.popStack()
                this.buf += (curr.type === StackItemType.Array ? "[]" : "{}");
                continue;
            }
            const index = curr.index++
            if (index >= curr.keys.length) {
                this.popStack()
                this.buf += (curr.type === StackItemType.Array ? ']' : '}')
                continue;
            }
            const key = curr.keys[index]
            const nextObject = curr.obj[key]
            this.pushStackObject(nextObject, getStackItemType(nextObject))

            if (curr.type !== StackItemType.Array) {
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

    private pushStackObject = (obj: any, type: StackItemType) => {
        if (type & StackItemType.ArrayOrObject) {
            if (this._objectStackSet.has(obj)) {
                throw Error('cyclic object detected');
            }
            this._objectStackSet.add(obj)
        }
        const top: JsonStringifyStackItem = {
            obj,
            type,
            keys: type === StackItemType.Object ? Object.keys(obj).filter(key => obj[key] !== undefined) : type === StackItemType.Array ? Object.keys(obj) : [],
            index: 0,
        }
        this._stack.push(top)
        this._stackTop = top
    }

    private popStack = () => {
        const curr = this._stackTop
        this._stack.pop()
        if (curr === null) {
            throw Error(`stack empty and cannot pop`)
        }

        const len = this._stack.length
        this._stackTop = len > 0 ? this._stack[len - 1] : null;
        if (curr.type & StackItemType.ArrayOrObject) {
            this._objectStackSet.delete(curr.obj)
        }
    }
}