import { type NextFunction, type Request, type Response, Router } from 'express';
import { asyncWrapperMiddleware } from '@myrotvorets/express-async-middleware-wrapper';
import { type ErrorResponse, numberParamHandler } from '@myrotvorets/express-microservice-middlewares';
import type { LocalsWithContainer } from '../lib/container.mjs';

function transformStreamError(e: Error): Error | ErrorResponse {
    if ('code' in e && e.code === 'ENOENT') {
        return {
            success: false,
            status: 404,
            code: 'NOT_FOUND',
            message: 'File not found',
        };
    }

    return e;
}

interface SearchParams {
    guid: string;
}

function retrieveSearchHandler(
    req: Request<SearchParams, never, never, never>,
    res: Response<never, LocalsWithContainer>,
    next: NextFunction,
): void {
    const { guid } = req.params;
    const service = res.locals.container.resolve('downloadService');

    const stream = service.getFile(guid);
    stream.on('error', (e: Error) => {
        res.removeHeader('Content-Type');
        next(transformStreamError(e));
    });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31556952, immutable');
    stream.pipe(res);
}

interface CompareParams {
    guid: string;
    number: number;
}

function retrieveCompareHandler(
    req: Request<CompareParams, never, never, never>,
    res: Response<never, LocalsWithContainer>,
    next: NextFunction,
): void {
    const { guid, number } = req.params;
    const service = res.locals.container.resolve('downloadService');

    const stream = service.getFile(guid, number);
    stream.on('error', (e: Error) => {
        res.removeHeader('Content-Type');
        next(transformStreamError(e));
    });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31556952, immutable');
    stream.pipe(res);
}

interface CountPhotosParams {
    guid: string;
}

interface CountPhotosResponse {
    success: true;
    files: number;
}

async function countPhotosHandler(
    req: Request<CountPhotosParams, CountPhotosResponse, never, never>,
    res: Response<CountPhotosResponse, LocalsWithContainer>,
): Promise<void> {
    const { guid } = req.params;
    const service = res.locals.container.resolve('downloadService');
    const files = await service.countFiles(guid);

    res.json({
        success: true,
        files,
    });
}

export function downloadController(): Router {
    const router = Router();
    router.param('number', numberParamHandler);

    router.get('/get/:guid/:number', retrieveCompareHandler);
    router.get('/get/:guid', retrieveSearchHandler);
    router.get('/count/:guid', asyncWrapperMiddleware(countPhotosHandler));

    return router;
}
