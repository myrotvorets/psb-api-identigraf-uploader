import { type NextFunction, type Request, type Response, Router } from 'express';
import { asyncWrapperMiddleware } from '@myrotvorets/express-async-middleware-wrapper';
import type { LocalsWithContainer } from '../lib/container.mjs';

interface UploadParams {
    guid: string;
}

interface UploadResponse {
    success: true;
}

async function searchUploadHandler(
    req: Request<UploadParams, UploadResponse, never, never>,
    res: Response<UploadResponse, LocalsWithContainer>,
    next: NextFunction,
): Promise<void> {
    const file = (req.files as Express.Multer.File[])[0]!;
    const { guid } = req.params;
    const service = res.locals.container.resolve('uploadService');

    await service.uploadFile(file, guid);
    res.json({
        success: true,
    });

    next();
}

async function compareUploadHandler(
    req: Request<UploadParams, UploadResponse, never, never>,
    res: Response<UploadResponse, LocalsWithContainer>,
    next: NextFunction,
): Promise<void> {
    const files = req.files as Express.Multer.File[];
    const { guid } = req.params;
    const service = res.locals.container.resolve('uploadService');

    await Promise.all(files.map((file, index) => service.uploadFile(file, guid, index)));

    res.json({
        success: true,
    });

    next();
}

export function uploadController(): Router {
    const router = Router();
    router.post('/search/:guid', asyncWrapperMiddleware(searchUploadHandler));
    router.post('/compare/:guid', asyncWrapperMiddleware(compareUploadHandler));
    return router;
}
