import { Readable, Writable } from 'node:stream';
import type { MakeDirectoryOptions, PathLike } from 'node:fs';
import { mock } from 'node:test';
import type { VFSStats } from '@wwa/statvfs';
import type { FileServiceInterface } from '../services/fileserviceinterface.mjs';
import { goodStats } from '../fixtures/vfsstats.mjs';

export const accessMock = mock.fn<(path: PathLike, mode?: number) => Promise<void>>(() => Promise.resolve());
export const readdirMock = mock.fn<(path: PathLike) => Promise<string[]>>(() => Promise.resolve([]));
export const createReadStreamMock = mock.fn<(path: PathLike) => NodeJS.ReadableStream>(
    () =>
        new Readable({
            read(): void {
                this.push(null);
            },
        }),
);

export const statvfsMock = mock.fn<(path: string | Buffer) => Promise<VFSStats>>(() => Promise.resolve(goodStats));

export class FakeFileService implements FileServiceInterface {
    public access(path: PathLike, mode?: number): Promise<void> {
        return accessMock(path, mode);
    }

    public mkdir(_path: PathLike, _options?: MakeDirectoryOptions): Promise<string | undefined> {
        return Promise.resolve(undefined);
    }

    public createReadStream(path: PathLike): NodeJS.ReadableStream {
        return createReadStreamMock(path);
    }

    public createWriteStream(_path: PathLike): NodeJS.WritableStream {
        return new Writable({
            write(_chunk, _encoding, callback): void {
                callback();
            },
        });
    }

    public readdir(path: PathLike): Promise<string[]> {
        return readdirMock(path);
    }

    public statvfs(path: string | Buffer): Promise<VFSStats> {
        return statvfsMock(path);
    }
}
