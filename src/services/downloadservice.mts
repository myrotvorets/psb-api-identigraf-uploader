import { join } from 'node:path';
import { DownloadServiceInterface } from './downloadserviceinterface.mjs';
import { FileServiceInterface } from './fileserviceinterface.mjs';
import { hashGuid } from '../lib/utils.mjs';

export interface DownloadServiceOptions {
    basePath: string;
    fileService: FileServiceInterface;
}

export class DownloadService implements DownloadServiceInterface {
    readonly #basePath: string;
    readonly #fileService: FileServiceInterface;

    public constructor({ basePath, fileService }: DownloadServiceOptions) {
        this.#basePath = basePath;
        this.#fileService = fileService;
    }

    public getFile(guid: string, n?: number | undefined): NodeJS.ReadableStream {
        let name = join(this.#basePath, hashGuid(guid), guid);
        if (n !== undefined) {
            name += `-${n}`;
        }

        name += '.jpg';
        return this.#fileService.createReadStream(name);
    }

    public async countFiles(guid: string): Promise<number> {
        const dir = join(this.#basePath, hashGuid(guid));
        const files = await this.#fileService.readdir(dir);
        const re = new RegExp(`^${guid}(-\\d+)?\\.jpg$`, 'u');
        return files.filter((f) => re.test(f)).length;
    }
}
