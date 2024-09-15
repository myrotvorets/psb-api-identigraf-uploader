import { join } from 'node:path';
import { BufferStream } from '@myrotvorets/buffer-stream';
import { pipeline } from 'node:stream/promises';
import type { UploadServiceInterface, UploadedFile } from './uploadserviceinterface.mjs';
import { hashGuid } from '../lib/utils.mjs';
import { ImageServiceInterface } from './imageserviceinterface.mjs';
import { FileServiceInterface } from './fileserviceinterface.mjs';

type UploadedFileInternal =
    | (Pick<Express.Multer.File, 'path' | 'destination'> & { buffer: undefined })
    | (Pick<Express.Multer.File, 'buffer'> & { path: undefined; destination: undefined });

export interface UploadServiceOptions {
    basePath: string;
    fileService: FileServiceInterface;
    imageService: ImageServiceInterface;
}

export class UploadService implements UploadServiceInterface {
    readonly #destPath: string;
    readonly #fileService: FileServiceInterface;
    readonly #imageService: ImageServiceInterface;

    public constructor({ basePath, fileService, imageService }: UploadServiceOptions) {
        this.#destPath = basePath;
        this.#fileService = fileService;
        this.#imageService = imageService;
    }

    public async uploadFile(file: UploadedFile, guid: string, n?: number): Promise<string> {
        const f = file as unknown as UploadedFileInternal;
        let stream: NodeJS.ReadableStream = f.path
            ? this.#fileService.createReadStream(f.path)
            : new BufferStream(f.buffer!);

        stream = await this.#imageService.convertToJpeg(this.#imageService.autoRotate(stream));

        const hashedPath = hashGuid(guid);
        const filename = this.getFilename(guid, n);

        const destPath = join(this.#destPath, hashedPath);
        const destJpeg = join(destPath, filename);

        await this.#fileService.mkdir(destPath, { recursive: true, mode: 0o755 });

        const destStream = this.#fileService.createWriteStream(destJpeg);
        await pipeline(stream, destStream);
        return destJpeg;
    }

    protected getFilename(guid: string, n: number | undefined): string {
        let name = guid;
        if (n !== undefined) {
            name += `-${n}`;
        }

        name += '.jpg';
        return name;
    }
}
