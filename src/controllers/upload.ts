import path from 'path';
import { constants, promises } from 'fs';
import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import asyncWrapper from '@myrotvorets/express-async-middleware-wrapper';
import { ErrorResponse } from '@myrotvorets/express-microservice-middlewares';
import fg from 'fast-glob';
import { Environment, environment } from '../lib/environment';
import { UploadService } from '../services/upload';

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
    promises
        .access(fname, constants.R_OK)
        .then(() =>
            res.sendFile(fname, {
                maxAge: 31556952,
            }),
        )
        .catch(() =>
            next({
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
        const fname = path.resolve(path.join(env.IDENTIGRAF_UPLOAD_FOLDER, UploadService.filenameByGuid(guid)));
        sendFile(fname, res, next);
    };
}

function retrieveCompareHandler(env: Environment): RequestHandler<UploadParams> {
    return (req: Request<UploadParams>, res: Response, next: NextFunction): void => {
        const { guid, number } = req.params;
        const fname = path.resolve(
            path.join(env.IDENTIGRAF_UPLOAD_FOLDER, UploadService.filenameByGuid(`${guid}-${number}`)),
        );

        sendFile(fname, res, next);
    };
}

interface CountPhotosResponse {
    success: true;
    files: number;
}

function countPhotosHandler(env: Environment): RequestHandler<UploadParams> {
    return async (req: Request<UploadParams>, res: Response<CountPhotosResponse>): Promise<void> => {
        const { guid } = req.params;
        const fname = path.resolve(
            path.join(env.IDENTIGRAF_UPLOAD_FOLDER, UploadService.filenameByGuid(guid, '-*.jpg')),
        );

        const entries = await fg(fname, {
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

export default function (): Router {
    const env = environment();
    const router = Router();

    router.post('/search/:guid', asyncWrapper(searchUploadHandler as RequestHandler));
    router.post('/compare/:guid', asyncWrapper(compareUploadHandler as RequestHandler));
    router.get('/get/:guid/:number', retrieveCompareHandler(env));
    router.get('/get/:guid', retrieveSearchHandler(env));
    router.get('/count/:guid', asyncWrapper(countPhotosHandler(env) as RequestHandler));

    return router;
}
