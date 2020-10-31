import express from 'express';
import request from 'supertest';
import multer from 'multer';
import path from 'path';
import fg from 'fast-glob';
import { promises } from 'fs';
import { configureApp } from '../../../src/server';
import { environment } from '../../../src/lib/environment';
import { checkBadRequest, checkUnsupportedMediaType, multerImplementation } from './helpers';
import { UploadService } from '../../../src/services/upload';

jest.mock('multer');
const mockedMulter = multer as jest.MockedFunction<typeof multer>;
mockedMulter.MulterError = jest.requireActual<typeof multer>('multer').MulterError;
mockedMulter.memoryStorage = jest.requireActual<typeof multer>('multer').memoryStorage;

jest.mock('fast-glob');
const mockedFg = fg as jest.MockedFunction<typeof fg>;

jest.mock('../../../src/services/upload');
const mockedUploadService = UploadService as jest.MockedClass<typeof UploadService>;
const mockedFBG = mockedUploadService.filenameByGuid as jest.MockedFunction<typeof mockedUploadService.filenameByGuid>;

const mockedAccess = jest.spyOn(promises, 'access');

let app: express.Express;
const env = { ...process.env };

const UPLOAD_PATH = '/somewhere';

async function buildApp(): Promise<express.Express> {
    process.env = {
        NODE_ENV: 'test',
        PORT: '3030',
        IDENTIGRAF_UPLOAD_FOLDER: UPLOAD_PATH,
        IDENTIGRAF_MAX_FILE_SIZE: '100',
    };

    environment();

    const application = express();
    application.disable('x-powered-by');
    await configureApp(application);
    return application;
}

function checkNotFoundResponse(res: request.Response): void {
    expect(res.body).toStrictEqual(
        expect.objectContaining({
            success: false,
            status: 404,
            code: 'NOT_FOUND',
        }),
    );

    expect(mockedAccess).toHaveBeenCalledTimes(1);
    expect(mockedFBG).toHaveBeenCalledTimes(1);
}

beforeEach(() => {
    jest.resetAllMocks();
    mockedMulter.mockImplementation(multerImplementation);

    return buildApp().then((application) => {
        app = application;
    });
});

afterEach(() => (process.env = { ...env }));

describe('searchUploadHandler', () => {
    describe('Error handling', () => {
        it('should fail on empty upload (no Content-Type)', () => {
            return request(app)
                .post('/search/00000000-0000-0000-0000-000000000000')
                .expect(415)
                .expect('Content-Type', /json/u)
                .expect(checkUnsupportedMediaType);
        });

        it('should fail on empty upload (with Content-Type)', () => {
            return request(app)
                .post('/search/00000000-0000-0000-0000-000000000000')
                .set('Content-Type', 'image/png')
                .expect(415)
                .expect('Content-Type', /json/u)
                .expect(checkUnsupportedMediaType);
        });

        it('should fail on more than one file', () => {
            return request(app)
                .post('/search/00000000-0000-0000-0000-000000000000')
                .set('Content-Type', 'miltipart/form-data')
                .attach('photo', `${__dirname}/../../fixtures/0057B7.png`)
                .attach('photo', `${__dirname}/../../fixtures/FFD700.png`)
                .expect(400)
                .expect('Content-Type', /json/u)
                .expect(checkBadRequest);
        });
    });

    describe('Normal operation', () => {
        it('should behave correctly', () => {
            return request(app)
                .post('/search/00000000-0000-0000-0000-000000000000')
                .set('Content-Type', 'image/png')
                .attach('photo', `${__dirname}/../../fixtures/0057B7.png`)
                .expect(200)
                .expect('Content-Type', /json/u)
                .expect({ success: true });
        });
    });
});

describe('compareUploadHandler', () => {
    describe('Normal operation', () => {
        it('should behave correctly', () => {
            return request(app)
                .post('/compare/00000000-0000-0000-0000-000000000000')
                .set('Content-Type', 'multipart/form-data')
                .attach('photos', `${__dirname}/../../fixtures/0057B7.png`)
                .attach('photos', `${__dirname}/../../fixtures/FFD700.png`)
                .expect(200)
                .expect('Content-Type', /json/u)
                .expect({ success: true });
        });
    });
});

describe('retrieveSearchHandler', () => {
    describe('Normal operation', () => {
        it('should handle "File not found" condition', () => {
            mockedAccess.mockRejectedValueOnce(new Error('FAIL'));
            mockedFBG.mockImplementationOnce(() => 'something');

            return request(app)
                .get('/get/00000000-0000-0000-0000-000000000000')
                .expect(404)
                .expect('Content-Type', /json/u)
                .expect(checkNotFoundResponse);
        });
    });
});

describe('retrieveCompareHandler', () => {
    describe('Normal operation', () => {
        it('should handle "File not found" condition', () => {
            mockedAccess.mockRejectedValueOnce(new Error('FAIL'));
            mockedFBG.mockImplementationOnce(() => 'something');

            return request(app)
                .get('/get/00000000-0000-0000-0000-000000000000/1')
                .expect(404)
                .expect('Content-Type', /json/u)
                .expect(checkNotFoundResponse);
        });
    });
});

describe('countHandler', () => {
    describe('Normal operation', () => {
        it('should behave correctly', () => {
            const filemask = 'blah';
            mockedFg.mockResolvedValueOnce([]);
            (mockedUploadService.filenameByGuid as jest.MockedFunction<
                typeof mockedUploadService.filenameByGuid
            >).mockImplementationOnce(() => filemask);

            const expected = {
                success: true,
                files: 0,
            };

            return request(app)
                .get('/count/00000000-0000-0000-0000-000000000000')
                .expect(200)
                .expect('Content-Type', /json/u)
                .expect(expected)
                .expect(() => {
                    expect(mockedFg).toHaveBeenCalledTimes(1);
                    expect(mockedFg).toHaveBeenCalledWith(path.join(UPLOAD_PATH, filemask), expect.any(Object));
                });
        });
    });
});
