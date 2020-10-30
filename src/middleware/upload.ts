import { NextFunction, Request, RequestHandler, Response } from 'express';
import multer, { MulterError } from 'multer';
import { ErrorResponse } from '@myrotvorets/express-microservice-middlewares';
import { Environment, environment } from '../lib/environment';
import { normalizeFiles, unlink } from '../utils';

const singleFileUploader = (env: Environment): multer.Multer =>
    multer({
        dest: env.IDENTIGRAF_UPLOAD_FOLDER,
        limits: {
            files: 1,
            fileSize: env.IDENTIGRAF_MAX_FILE_SIZE,
        },
    });

const multipleFileUploader = (env: Environment, maxFiles: number): multer.Multer =>
    multer({
        dest: env.IDENTIGRAF_UPLOAD_FOLDER,
        limits: {
            files: maxFiles,
            fileSize: env.IDENTIGRAF_MAX_FILE_SIZE,
        },
    });

const noFile: ErrorResponse = {
    success: false,
    status: 400,
    code: 'NO_FILES',
    message: 'No files found in the request',
};

const tooFewFiles: ErrorResponse = {
    success: false,
    status: 400,
    code: 'TOO_FEW_FILES',
    message: 'Too few files uploaded',
};

const badFile: ErrorResponse = {
    success: false,
    status: 400,
    code: 'UNSUPPORTED_FILE',
    message: 'Unsupported file type',
};

const emptyFile: ErrorResponse = {
    success: false,
    status: 400,
    code: 'EMPTY_FILE',
    message: 'Empty file uploaded',
};

export function uploadSingleFileMiddleware(field: string): RequestHandler[] {
    const env = environment();
    return [
        singleFileUploader(env).single(field),
        (req: Request, res: Response, next: NextFunction): void => {
            if (!req.file) {
                return next(noFile);
            }

            if (!req.file.mimetype.startsWith('image/')) {
                return next(badFile);
            }

            if (req.file.size === 0) {
                return next(emptyFile);
            }

            return next();
        },
    ];
}

export function uploadMultipleFilesMiddleware(field: string, minFiles: number, maxFiles: number): RequestHandler[] {
    const env = environment();
    return [
        multipleFileUploader(env, maxFiles).array(field),
        (req: Request, res: Response, next: NextFunction): void => {
            if (!Array.isArray(req.files) || req.files.length === 0) {
                return next(noFile);
            }

            if (req.files.length < minFiles) {
                return next(tooFewFiles);
            }

            for (const { mimetype, size } of req.files) {
                if (!mimetype.startsWith('image/')) {
                    return next(badFile);
                }

                if (size === 0) {
                    return next(emptyFile);
                }
            }

            return next();
        },
    ];
}

async function cleanupFiles(req: Request): Promise<void> {
    const files = normalizeFiles(req);
    const promises = files.filter((file) => file.path).map((file) => unlink(file.path));
    await Promise.all(promises);
}

export function cleanUploadedFilesMiddleware(req: Request, res: Response, next: NextFunction): void {
    cleanupFiles(req).finally(next);
}

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
    await cleanupFiles(req);

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
