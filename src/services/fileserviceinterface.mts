import type { MakeDirectoryOptions, PathLike } from 'node:fs';
import type { VFSStats } from '@wwa/statvfs';

export interface FileServiceInterface {
    access(path: PathLike, mode?: number): Promise<void>;
    mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<string | undefined>;
    createReadStream(path: PathLike): NodeJS.ReadableStream;
    createWriteStream(path: PathLike): NodeJS.WritableStream;
    readdir(path: PathLike): Promise<string[]>;
    statvfs(path: string | Buffer): Promise<VFSStats>;
}
