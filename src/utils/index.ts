import { promises } from 'fs';

export async function unlink(path: string): Promise<void> {
    try {
        await promises.unlink(path);
    } catch (e) {
        console.warn(`Failed to unlink ${path}:`, e);
    }
}

type FileLike = Pick<Express.Multer.File, 'path'>;

interface RequestLike {
    file?: FileLike;
    files?: Record<string, FileLike[]> | FileLike[];
}

export function normalizeFiles(req: RequestLike): FileLike[] {
    if (!req.file && !req.files) {
        return [];
    }

    if (req.file) {
        return [req.file];
    }

    if (Array.isArray(req.files)) {
        return req.files;
    }

    return Object.entries(req.files as Record<string, FileLike[]>).flatMap((item) => item[1]);
}
