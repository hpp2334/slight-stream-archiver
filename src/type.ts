export interface IDataGenerator {
    next: () => Uint8Array | null
}