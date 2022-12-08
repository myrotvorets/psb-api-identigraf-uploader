import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import type { ErrorResponse } from '@myrotvorets/express-microservice-middlewares';
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
                const response: ErrorResponse = {
                    success: false,
                    status: 400,
                    code: errorLookupTable[err.code] || 'BAD_REQUEST',
                    message: err.message,
                };

                process.nextTick(next, response);
            } else {
                process.nextTick(next, err);
            }
        })
        .catch((e) => process.nextTick(next, e));
}
