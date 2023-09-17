import { join, resolve } from 'node:path';
import { access, constants } from 'node:fs/promises';
import { type NextFunction, type Request, type RequestHandler, type Response, Router } from 'express';
import { asyncWrapperMiddleware } from '@myrotvorets/express-async-middleware-wrapper';
import { ErrorResponse } from '@myrotvorets/express-microservice-middlewares';
import * as fastglob from 'fast-glob';
import { Environment, environment } from '../lib/environment.mjs';
import { UploadService } from '../services/upload.mjs';

const { glob } = fastglob;

interface UploadParams extends Record<string, string> {
    guid: string;
}

interface UploadResponse {
    success: true;
}

async function searchUploadHandler(
    req: Request<UploadParams>,
    res: Response<UploadResponse>,
    next: NextFunction,
): Promise<void> {
    const file = (req.files as Express.Multer.File[])[0];
    const { guid } = req.params;

    await UploadService.uploadFile(file, guid);
    res.json({
        success: true,
    });

    next();
}

async function compareUploadHandler(
    req: Request<UploadParams>,
    res: Response<UploadResponse>,
    next: NextFunction,
): Promise<void> {
    const files = req.files as Express.Multer.File[];
    const { guid } = req.params;

    await Promise.all(files.map((file, index) => UploadService.uploadFile(file, `${guid}-${index}`)));

    res.json({
        success: true,
    });

    next();
}

function sendFile(fname: string, res: Response, next: NextFunction): void {
    access(fname, constants.R_OK)
        .then(() =>
            res.sendFile(fname, {
                maxAge: 31556952,
            }),
        )
        .catch(() =>
            setImmediate<ErrorResponse[]>(next, {
                success: false,
                status: 404,
                code: 'NOT_FOUND',
                message: 'File not found',
            } as ErrorResponse),
        );
}

function retrieveSearchHandler(env: Environment): RequestHandler<UploadParams> {
    return (req: Request<UploadParams>, res: Response, next: NextFunction): void => {
        const { guid } = req.params;
        const fname = resolve(join(env.IDENTIGRAF_UPLOAD_FOLDER, UploadService.filenameByGuid(guid)));
        sendFile(fname, res, next);
    };
}

function retrieveCompareHandler(env: Environment): RequestHandler<UploadParams> {
    return (req: Request<UploadParams>, res: Response, next: NextFunction): void => {
        const { guid, number } = req.params;
        const fname = resolve(join(env.IDENTIGRAF_UPLOAD_FOLDER, UploadService.filenameByGuid(`${guid}-${number}`)));

        sendFile(fname, res, next);
    };
}

interface CountPhotosResponse {
    success: true;
    files: number;
}

function countPhotosHandler(env: Environment): RequestHandler<UploadParams> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return async (req: Request<UploadParams>, res: Response<CountPhotosResponse>): Promise<void> => {
        const { guid } = req.params;
        const fname = resolve(join(env.IDENTIGRAF_UPLOAD_FOLDER, UploadService.filenameByGuid(guid, '-*.jpg')));

        const entries = await glob(fname, {
            braceExpansion: false,
            onlyFiles: true,
            suppressErrors: true,
        });

        res.json({
            success: true,
            files: entries.length,
        });
    };
}

export function uploadController(): Router {
    const env = environment();
    const router = Router();

    router.post('/search/:guid', asyncWrapperMiddleware(searchUploadHandler));
    router.post('/compare/:guid', asyncWrapperMiddleware(compareUploadHandler));
    router.get('/get/:guid/:number', retrieveCompareHandler(env));
    router.get('/get/:guid', retrieveSearchHandler(env));
    router.get('/count/:guid', asyncWrapperMiddleware(countPhotosHandler(env)));

    return router;
}
