import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ErrorResponse } from '@myrotvorets/express-microservice-middlewares';
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

export async function uploadErrorHandlerMiddleware(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    await cleanupFilesAfterMulter(req);

    if (err && typeof err === 'object' && err instanceof MulterError) {
        const response: ErrorResponse = {
            success: false,
            status: 400,
            code: errorLookupTable[err.code] || 'BAD_REQUEST',
            message: err.message,
        };

        next(response);
    } else {
        next(err);
    }
}
