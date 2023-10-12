import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import sharp from 'sharp';

type UploadedFileInternal =
    | (Pick<Express.Multer.File, 'path' | 'destination'> & { buffer: undefined })
    | (Pick<Express.Multer.File, 'buffer'> & { path: undefined; destination: undefined });

type UploadedFile = Pick<Express.Multer.File, 'path' | 'destination' | 'buffer'>;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UploadService {
    public static async uploadFile(file: UploadedFile, guid: string): Promise<string> {
        const f = file as unknown as UploadedFileInternal;
        const img = await UploadService.prepareFile(f.path ?? f.buffer); // memoryStorage() returns Buffer
        const hashedPath = UploadService.hashFileName(guid);
        const filename = `${guid}.jpg`;
        const destPath = join(f.destination ?? tmpdir(), hashedPath); // No file.destination for memoryStorage()
        const destJpeg = join(destPath, filename);

        await mkdir(destPath, { recursive: true, mode: 0o755 });
        await img.toFile(destJpeg);

        return join(hashedPath, filename);
    }

    public static filenameByGuid(guid: string, ext = '.jpg'): string {
        if (!/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/u.test(guid)) {
            throw new TypeError(`GUID is not valid: ${guid}`);
        }

        const hashedPath = UploadService.hashFileName(guid);
        const filename = `${guid}${ext}`;
        return join(hashedPath, filename);
    }

    private static async prepareFile(path: string | Buffer): Promise<sharp.Sharp> {
        const img = sharp(path, { failOnError: false, sequentialRead: true });

        const metadata = await img.metadata();
        const isJPEG = metadata.format === 'jpeg';
        const sf = metadata.chromaSubsampling || '4:2:0';
        const isProgressive = !!metadata.isProgressive;
        const flag = !isJPEG || sf !== '4:2:0' || isProgressive;
        img.rotate();
        if (flag) {
            img.jpeg({
                progressive: false,
                chromaSubsampling: '4:2:0',
                optimizeCoding: true,
                optimizeScans: true,
            });
        }

        return img;
    }

    private static hashFileName(guid: string, separator: string = sep): string {
        return [guid.substring(0, 2), guid.substring(2, 4), guid.substring(4, 6)].join(separator);
    }
}
