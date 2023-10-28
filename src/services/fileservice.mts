/* c8 ignore start */
import { type MakeDirectoryOptions, type PathLike, createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, readdir } from 'node:fs/promises';
import { type VFSStats, statvfs } from '@wwa/statvfs';
import type { FileServiceInterface } from './fileserviceinterface.mjs';

export class FileService implements FileServiceInterface {
    public access(path: PathLike, mode?: number): Promise<void> {
        return access(path, mode);
    }

    public mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<string | undefined> {
        return mkdir(path, options);
    }

    public createReadStream(path: PathLike): NodeJS.ReadableStream {
        return createReadStream(path);
    }

    public createWriteStream(path: PathLike): NodeJS.WritableStream {
        return createWriteStream(path);
    }

    public readdir(path: PathLike): Promise<string[]> {
        return readdir(path);
    }

    public statvfs(path: string | Buffer): Promise<VFSStats> {
        return statvfs(path);
    }
}
/* c8 ignore stop */
