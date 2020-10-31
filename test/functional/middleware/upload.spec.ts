import express, { NextFunction } from 'express';
import request from 'supertest';
import { ErrorResponse, errorMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { ErrorCode, MulterError } from 'multer';
import { uploadErrorHandlerMiddleware } from '../../../src/middleware/upload';
import { environment } from '../../../src/lib/environment';

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

beforeEach(() => {
    jest.resetAllMocks();
    app = buildApp();
});

afterEach(() => {
    process.env = { ...env };
    console.warn = warn;
});

describe('uploadErrorHandlerMiddleware', () => {
    it('should not modify non-multer errors', () => {
        app.use('/', (req, res, next: NextFunction) => next(new Error()));
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
            });
    });
});
