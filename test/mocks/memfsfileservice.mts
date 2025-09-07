import type { MakeDirectoryOptions, PathLike } from 'node:fs';
import { type DirectoryJSON, type IFs, Volume, createFsFromVolume } from 'memfs';
import type { VFSStats } from '@wwa/statvfs';
import type { FileServiceInterface } from '../services/fileserviceinterface.mjs';

export class MemFSService implements FileServiceInterface {
    readonly #ifs: IFs;
    readonly #vol: ReturnType<typeof Volume.fromJSON>;

    public constructor(seed: DirectoryJSON = {}) {
        this.#vol = Volume.fromJSON(seed);
        this.#ifs = createFsFromVolume(this.#vol);
    }

    public get volume(): DirectoryJSON {
        return this.#vol.toJSON();
    }

    public populate(data: DirectoryJSON): void {
        this.#vol.fromJSON(data);
    }

    public reset(): void {
        this.#vol.reset();
    }

    public access(path: PathLike, mode?: number): Promise<void> {
        return this.#ifs.promises.access(path, mode);
    }

    public mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<string | undefined> {
        return this.#ifs.promises.mkdir(path, options);
    }

    public createReadStream(path: PathLike): NodeJS.ReadableStream {
        return this.#ifs.createReadStream(path);
    }

    public createWriteStream(path: PathLike): NodeJS.WritableStream {
        return this.#ifs.createWriteStream(path);
    }

    public readdir(path: PathLike): Promise<string[]> {
        return this.#ifs.promises.readdir(path) as Promise<string[]>;
    }

    public statvfs(_path: string | Buffer): Promise<VFSStats> {
        throw new Error('Not implemented');
    }
}
