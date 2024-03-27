import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ApiError } from '@myrotvorets/express-microservice-middlewares';
import { cleanupFilesAfterMulter } from '@myrotvorets/clean-up-after-multer';

const errorLookupTable: Record<string, string> = {
    LIMIT_PART_COUNT: 'UPLOAD_LIMIT_PART_COUNT',
    LIMIT_FILE_SIZE: 'UPLOAD_LIMIT_FILE_SIZE',
    LIMIT_FILE_COUNT: 'UPLOAD_LIMIT_FILE_COUNT',
    LIMIT_FIELD_KEY: 'UPLOAD_LIMIT_FIELD_KEY',
    LIMIT_FIELD_VALUE: 'UPLOAD_LIMIT_FIELD_VALUE',
    LIMIT_FIELD_COUNT: 'UPLOAD_LIMIT_FIELD_COUNT',
    LIMIT_UNEXPECTED_FILE: 'UPLOAD_LIMIT_UNEXPECTED_FILE',
};

export function uploadErrorHandlerMiddleware(err: unknown, req: Request, _res: Response, next: NextFunction): void {
    // eslint-disable-next-line promise/no-promise-in-callback
    cleanupFilesAfterMulter(req)
        .then(() => {
            if (err && typeof err === 'object' && err instanceof MulterError) {
                err = new ApiError(400, errorLookupTable[err.code] ?? 'BAD_REQUEST', err.message, {
                    cause: err,
                });
            }

            process.nextTick(next, err);
        })
        .catch((e: unknown) => process.nextTick(next, e));
}
