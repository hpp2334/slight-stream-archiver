import ensureWasmLoaded, { InternalStreamZip } from "./pkg/rust_core"
import { IDataGenerator } from "./type";

export { ensureWasmLoaded };

type NextChunkHandler = (blob_id: number) => Uint8Array | null

class GlobalManager {
    private _allocZipId = 0;
    private next_chunk_map = new Map<number, NextChunkHandler>()

    public initializeStreamZip = (options: {
        next_chunk: NextChunkHandler
    }): number => {
        const id = ++this._allocZipId
        this.next_chunk_map.set(id, options.next_chunk);
        return id;
    }

    public next_chunk = (zip_id: number, blob_id: number): Uint8Array | null => {
        if (!this.next_chunk_map.has(zip_id)) {
            throw Error(`stream zip ${zip_id} not found`)
        }
        const handler = this.next_chunk_map.get(zip_id)!
        return handler(blob_id)
    }

    public removeNextChunkHandler = (zip_id: number) => {
        this.next_chunk_map.delete(zip_id)
    }
}

const globalManager = new GlobalManager();
(globalThis as any)['___SLIGHT_STREAM_ZIP___GLOBAL_MANAGER_'] = globalManager;

class DataGeneratorManager {
    private _allocId = 0;
    private generators = new Map<number, IDataGenerator>()

    public add = (dataGenerator: IDataGenerator): number => {
        const id = ++this._allocId;
        this.generators.set(id, dataGenerator)
        return id;
    }

    public nextChunk = (id: number) => {
        if (!this.generators.has(id)) {
            throw Error(`Data generator ${id} not exist.`);
        }
        const generator = this.generators.get(id)!;
        const chunk = generator.next()
        return chunk;
    }
}

export class StreamZip {
    private _id: number;
    private _internalZip: InternalStreamZip;
    private _dataGeneratorManager = new DataGeneratorManager()
    private _isFinished = false;

    constructor() {
        this._id = globalManager.initializeStreamZip({
            next_chunk: (blob_id) => {
                return this._dataGeneratorManager.nextChunk(blob_id)
            }
        })
        this._internalZip = new InternalStreamZip(this._id)
    }

    public addFile = (path: string, dataGenerator: IDataGenerator) => {
        this.ensureNotFinish("Cannot add file to a finished stream zip.");
        this._internalZip.add_file(path, this._dataGeneratorManager.add(dataGenerator))
    }

    public addFolder = (path: string) => {
        this.ensureNotFinish("Cannot add folder to a finished stream zip.");
        this._internalZip.add_folder(path)
    }

    public finish = (): Uint8Array => {
        this.ensureNotFinish("The stream zip is already finished.");
        this._isFinished = true;

        const buf = this._internalZip.finish()
        globalManager.removeNextChunkHandler(this._id)
        return buf
    }

    private ensureNotFinish(msg: string) {
        if (this._isFinished) {
            throw new Error(msg);
        }
    }
}
