import '../../helpers/mockfs';
import fs from 'fs';
import express, { NextFunction, Request, RequestHandler } from 'express';
import request from 'supertest';
import { ErrorResponse, errorMiddleware } from '@myrotvorets/express-microservice-middlewares';
import multer, { ErrorCode, MulterError } from 'multer';
import {
    cleanUploadedFilesMiddleware,
    uploadErrorHandlerMiddleware,
    uploadMultipleFilesMiddleware,
    uploadSingleFileMiddleware,
} from '../../../src/middleware/upload';
import { environment } from '../../../src/lib/environment';
import {
    checkEmptyFile,
    checkNoFiles,
    checkTooFewFiles,
    checkUnsupportedFile,
    file,
    multerArray,
    multerImplementation,
    multerSingle,
} from './helpers';

jest.mock('multer');

const mockedMulter = multer as jest.MockedFunction<typeof multer>;
mockedMulter.MulterError = jest.requireActual<typeof multer>('multer').MulterError;

const mockedUnlink = fs.promises.unlink as jest.MockedFunction<typeof fs.promises.unlink>;

let app: express.Express;

const warn = console.warn;
const env = { ...process.env };

const UPLOAD_PATH = '/somewhere';

function buildApp(): express.Express {
    process.env = {
        NODE_ENV: 'test',
        PORT: '3030',
        IDENTIGRAF_UPLOAD_FOLDER: UPLOAD_PATH,
        IDENTIGRAF_MAX_FILE_SIZE: '100',
    };

    environment();

    const application = express();
    application.disable('x-powered-by');
    return application;
}

function checkSuccessfulUpload(res: Response): void {
    expect(res.body).toEqual({});
    expect(mockedUnlink).toHaveBeenCalledTimes(1);
    expect(mockedUnlink).toHaveBeenCalledWith(file.path);
}

beforeEach(() => {
    jest.clearAllMocks();
    mockedMulter.mockImplementation(multerImplementation);
    multerSingle.mockReset();
    multerArray.mockReset();
    app = buildApp();
});

afterEach(() => {
    process.env = { ...env };
    console.warn = warn;
});

describe('uploadSingleFileMiddleware', () => {
    it('should handle the case with no files', () => {
        multerSingle.mockImplementation((): RequestHandler => (req, res, next: NextFunction): void => next());

        app.use(uploadSingleFileMiddleware('field'));
        app.use(errorMiddleware);

        return request(app).get('/').expect(400).expect('Content-Type', /json/u).expect(checkNoFiles);
    });

    it('should handle the case with a non-image file', () => {
        multerSingle.mockImplementation(
            (): RequestHandler => (req: Request, res, next: NextFunction): void => {
                req.file = { ...file, mimetype: 'text/plain' };
                next();
            },
        );

        app.use(uploadSingleFileMiddleware('field'));
        app.use(errorMiddleware);

        return request(app).get('/').expect(400).expect('Content-Type', /json/u).expect(checkUnsupportedFile);
    });

    it('should handle the case with an empty file', () => {
        multerSingle.mockImplementation(
            (): RequestHandler => (req: Request, res, next: NextFunction): void => {
                req.file = { ...file, size: 0 };
                next();
            },
        );

        app.use(uploadSingleFileMiddleware('field'));
        app.use(errorMiddleware);

        return request(app).get('/').expect(400).expect('Content-Type', /json/u).expect(checkEmptyFile);
    });

    it('should handle the normal file upload', () => {
        mockedUnlink.mockResolvedValue();
        multerSingle.mockImplementation(
            (): RequestHandler => (req: Request, res, next: NextFunction): void => {
                req.file = { ...file };
                next();
            },
        );

        app.use(uploadSingleFileMiddleware('field'));
        app.use((req, res, next) => {
            res.json({});
            next();
        });

        app.use(cleanUploadedFilesMiddleware);
        app.use(errorMiddleware);

        return request(app).get('/').expect(200).expect('Content-Type', /json/u).expect(checkSuccessfulUpload);
    });
});

describe('uploadMultipleFilesMiddleware', () => {
    it('should handle the case with no files', () => {
        multerArray.mockImplementation((): RequestHandler => (req, res, next: NextFunction): void => next());

        app.use(uploadMultipleFilesMiddleware('field', 1, 2));
        app.use(errorMiddleware);

        return request(app).get('/').expect(400).expect('Content-Type', /json/u).expect(checkNoFiles);
    });

    it('should handle the case with too few files', () => {
        multerArray.mockImplementation(
            (): RequestHandler => (req: Request, res, next: NextFunction): void => {
                req.files = [{ ...file, ...file }];
                next();
            },
        );

        app.use(uploadMultipleFilesMiddleware('field', 3, 4));
        app.use(errorMiddleware);

        return request(app).get('/').expect(400).expect('Content-Type', /json/u).expect(checkTooFewFiles);
    });

    it('should handle the case with a non-image file', () => {
        multerArray.mockImplementation(
            (): RequestHandler => (req: Request, res, next: NextFunction): void => {
                req.files = [{ ...file, mimetype: 'text/plain' }];
                next();
            },
        );

        app.use(uploadMultipleFilesMiddleware('field', 1, 2));
        app.use(errorMiddleware);

        return request(app).get('/').expect(400).expect('Content-Type', /json/u).expect(checkUnsupportedFile);
    });

    it('should handle the case with an empty file', () => {
        multerArray.mockImplementation(
            (): RequestHandler => (req: Request, res, next: NextFunction): void => {
                req.files = [{ ...file, size: 0 }];
                next();
            },
        );

        app.use(uploadMultipleFilesMiddleware('field', 1, 2));
        app.use(errorMiddleware);

        return request(app).get('/').expect(400).expect('Content-Type', /json/u).expect(checkEmptyFile);
    });

    it('should handle the normal file upload', () => {
        mockedUnlink.mockResolvedValue();
        multerArray.mockImplementation(
            (): RequestHandler => (req: Request, res, next: NextFunction): void => {
                req.files = [{ ...file }];
                next();
            },
        );

        app.use(uploadMultipleFilesMiddleware('field', 1, 2));
        app.use((req, res, next) => {
            res.json({});
            next();
        });

        app.use(cleanUploadedFilesMiddleware);
        app.use(errorMiddleware);

        return request(app).get('/').expect(200).expect('Content-Type', /json/u).expect(checkSuccessfulUpload);
    });
});

describe('cleanUploadedFilesMiddleware', () => {
    beforeEach(() => mockedUnlink.mockResolvedValue());

    it('should handle the case with no files', () => {
        app.use('/', (req, res, next: NextFunction) => {
            res.json({});
            next();
        });

        app.use(cleanUploadedFilesMiddleware);

        return request(app)
            .get('/')
            .expect(200)
            .expect('Content-Type', /json/u)
            .expect({})
            .expect(() => expect(mockedUnlink).not.toHaveBeenCalled());
    });

    it('should succeed even if unlink() fails', () => {
        mockedUnlink.mockRejectedValue(new Error());
        app.use('/', (req, res, next: NextFunction) => {
            req.file = { ...file };
            res.json({});
            next();
        });

        app.use(cleanUploadedFilesMiddleware);
        console.warn = jest.fn();

        return request(app)
            .get('/')
            .expect(200)
            .expect('Content-Type', /json/u)
            .expect({})
            .expect(() => {
                expect(mockedUnlink).toHaveBeenCalledTimes(1);
                expect(mockedUnlink).toHaveBeenCalledWith(file.path);
                expect(console.warn).toHaveBeenCalledTimes(1);
            });
    });

    it('should skip files with undefined path', () => {
        app.use('/', (req, res, next: NextFunction) => {
            req.file = { ...file, path: (undefined as unknown) as string };
            res.json({});
            next();
        });

        app.use(cleanUploadedFilesMiddleware);

        return request(app)
            .get('/')
            .expect(200)
            .expect('Content-Type', /json/u)
            .expect({})
            .expect(() => expect(mockedUnlink).not.toHaveBeenCalled());
    });
});

describe('uploadErrorHandlerMiddleware', () => {
    const cleanUploadedFilesMiddlewareSpy = jest.fn((req, res, next) => cleanUploadedFilesMiddleware(req, res, next));

    it('should not modify non-multer errors', () => {
        app.use('/', (req, res, next: NextFunction) => next(new Error()));
        app.use(cleanUploadedFilesMiddlewareSpy);
        app.use(uploadErrorHandlerMiddleware);
        app.use(errorMiddleware);
        return request(app)
            .get('/')
            .expect(500)
            .expect('Content-Type', /json/u)
            .expect((res) => {
                expect(res.body).not.toEqual({});
                expect(res.body).toHaveProperty('code');
                expect((res.body as ErrorResponse).code).toBe('UNKNOWN_ERROR');
                expect(cleanUploadedFilesMiddlewareSpy).not.toHaveBeenCalled();
            });
    });

    it.each<[ErrorCode, string]>([
        ['LIMIT_PART_COUNT', 'UPLOAD_LIMIT_PART_COUNT'],
        ['LIMIT_FILE_SIZE', 'UPLOAD_LIMIT_FILE_SIZE'],
        ['LIMIT_FILE_COUNT', 'UPLOAD_LIMIT_FILE_COUNT'],
        ['LIMIT_FIELD_KEY', 'UPLOAD_LIMIT_FIELD_KEY'],
        ['LIMIT_FIELD_VALUE', 'UPLOAD_LIMIT_FIELD_VALUE'],
        ['LIMIT_FIELD_COUNT', 'UPLOAD_LIMIT_FIELD_COUNT'],
        ['LIMIT_UNEXPECTED_FILE', 'UPLOAD_LIMIT_UNEXPECTED_FILE'],
        ['OTHER_ERROR' as ErrorCode, 'BAD_REQUEST'],
    ])('should properly handle Multer errors (%s => %s)', (error, expectedCode) => {
        app.use('/', (req, res, next: NextFunction) => next(new MulterError(error)));
        app.use(cleanUploadedFilesMiddlewareSpy);
        app.use(uploadErrorHandlerMiddleware);
        app.use(errorMiddleware);
        return request(app)
            .get('/')
            .expect(400)
            .expect('Content-Type', /json/u)
            .expect((res) => {
                expect(res.body).not.toEqual({});
                expect(res.body).toHaveProperty('code');
                expect((res.body as ErrorResponse).code).toBe(expectedCode);
                expect(cleanUploadedFilesMiddlewareSpy).not.toHaveBeenCalled();
            });
    });
});
