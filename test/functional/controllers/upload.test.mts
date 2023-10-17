import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as promises from 'node:fs/promises';
import { constants, readFile } from 'node:fs/promises';
import { expect } from 'chai';
import { type TestDouble, func, matchers, replace, replaceEsm, when } from 'testdouble';
import express, { type Express } from 'express';
import request from 'supertest';
import type { Sharp } from 'sharp';
import type fastGlob from 'fast-glob';
import { environment } from '../../../src/lib/environment.mjs';
import type * as uploader from '../../../src/services/upload.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const UPLOAD_PATH = '/somewhere';

function checkError(res: Response, expectedStatus: number, expectedCode: string): void {
    expect(res.body).to.be.an('object').and.include({
        code: expectedCode,
        status: expectedStatus,
    });
}

const checkUnsupportedMediaType = (res: Response): void => checkError(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
const checkBadRequest = (res: Response): void => checkError(res, 400, 'BAD_REQUEST');
const checkNotFoundResponse = (res: Response): void => checkError(res, 404, 'NOT_FOUND');

describe('Upload', function () {
    let app: Express;
    let upload: typeof uploader;
    let env: typeof process.env;

    let accessMock: TestDouble<typeof promises.access>;
    let mkDirMock: TestDouble<typeof promises.mkdir>;
    let globMock: TestDouble<typeof fastGlob>;
    let metadataMock: TestDouble<Sharp['metadata']>;
    let filenameByGuidMock: TestDouble<typeof uploader.UploadService.prototype.filenameByGuid>;

    before(function () {
        env = { ...process.env };

        accessMock = func<typeof promises.access>();
        mkDirMock = func<typeof promises.mkdir>();
        globMock = func<typeof fastGlob>();
        metadataMock = func<Sharp['metadata']>();
        filenameByGuidMock = func<typeof uploader.UploadService.prototype.filenameByGuid>();
    });

    beforeEach(async function () {
        when(metadataMock()).thenResolve({ format: 'jpeg', chromaSubsampling: '4:2:0', isProgressive: true });

        await replaceEsm('sharp', {
            default: () => ({
                metadata: metadataMock,
                jpeg: func(),
                toFile: func(),
                rotate: func(),
            }),
        });

        await replaceEsm('node:fs/promises', {
            ...promises,
            access: accessMock,
            mkdir: mkDirMock,
        });

        await replaceEsm('fast-glob', null, globMock);

        upload = await import('../../../src/services/upload.mjs');
        const { configureApp } = await import('../../../src/server.mjs');

        replace(upload.UploadService.prototype, 'filenameByGuid', filenameByGuidMock);

        process.env = {
            NODE_ENV: 'test',
            PORT: '3030',
            IDENTIGRAF_UPLOAD_FOLDER: UPLOAD_PATH,
            IDENTIGRAF_MAX_FILE_SIZE: '100',
        };

        environment(true);

        app = express();
        app.disable('x-powered-by');
        return configureApp(app);
    });

    afterEach(function () {
        process.env = { ...env };
    });

    describe('searchUploadHandler', function () {
        describe('Error handling', function () {
            it('should fail on empty upload (no Content-Type)', function () {
                return request(app)
                    .post('/search/00000000-0000-0000-0000-000000000000')
                    .expect(415)
                    .expect('Content-Type', /json/u)
                    .expect(checkUnsupportedMediaType);
            });

            it('should fail on empty upload (with Content-Type)', function () {
                return request(app)
                    .post('/search/00000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'image/png')
                    .expect(415)
                    .expect('Content-Type', /json/u)
                    .expect(checkUnsupportedMediaType);
            });

            it('should fail on more than one file', function () {
                return request(app)
                    .post('/search/00000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'miltipart/form-data')
                    .attach('photo', `${__dirname}/../../fixtures/0057B7.png`)
                    .attach('photo', `${__dirname}/../../fixtures/FFD700.png`)
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on a bad GUID', function () {
                return request(app)
                    .post('/search/Z0000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'image/png')
                    .attach('photo', `${__dirname}/../../fixtures/0057B7.png`)
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });
        });

        describe('Normal operation', function () {
            it('should behave correctly', function () {
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

    describe('compareUploadHandler', function () {
        describe('Error handling', function () {
            it('should fail on empty upload (no Content-Type)', function () {
                return request(app)
                    .post('/compare/00000000-0000-0000-0000-000000000000')
                    .expect(415)
                    .expect('Content-Type', /json/u)
                    .expect(checkUnsupportedMediaType);
            });

            it('should fail on empty upload (with Content-Type)', function () {
                return request(app)
                    .post('/compare/00000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'image/png')
                    .expect(415)
                    .expect('Content-Type', /json/u)
                    .expect(checkUnsupportedMediaType);
            });

            it('should fail on one file', function () {
                return request(app)
                    .post('/compare/00000000-0000-0000-0000-000000000000')
                    .attach('photo', `${__dirname}/../../fixtures/0057B7.png`)
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on too many files', function () {
                return request(app)
                    .post('/compare/00000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'multipart/form-data')
                    .attach('photos', `${__dirname}/../../fixtures/0057B7.png`)
                    .attach('photos', `${__dirname}/../../fixtures/FFD700.png`)
                    .attach('photos', `${__dirname}/../../fixtures/0057B7.png`)
                    .attach('photos', `${__dirname}/../../fixtures/FFD700.png`)
                    .attach('photos', `${__dirname}/../../fixtures/0057B7.png`)
                    .attach('photos', `${__dirname}/../../fixtures/FFD700.png`)
                    .attach('photos', `${__dirname}/../../fixtures/0057B7.png`)
                    .attach('photos', `${__dirname}/../../fixtures/FFD700.png`)
                    .attach('photos', `${__dirname}/../../fixtures/0057B7.png`)
                    .attach('photos', `${__dirname}/../../fixtures/FFD700.png`)
                    .attach('photos', `${__dirname}/../../fixtures/0057B7.png`)
                    .attach('photos', `${__dirname}/../../fixtures/FFD700.png`)
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on a bad GUID', function () {
                return request(app)
                    .post('/compare/Z0000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'multipart/form-data')
                    .attach('photos', `${__dirname}/../../fixtures/0057B7.png`)
                    .attach('photos', `${__dirname}/../../fixtures/FFD700.png`)
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });
        });

        describe('Normal operation', function () {
            it('should behave correctly', function () {
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

    describe('retrieveSearchHandler', function () {
        describe('Error handling', function () {
            it('should fail on a bad GUID', function () {
                return request(app)
                    .get('/get/Z0000000-0000-0000-0000-000000000000')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });
        });

        describe('Normal operation', function () {
            it('should handle "File not found" condition', function () {
                const guid = '00000000-0000-0000-0000-000000000000';
                const mockedFilename = '/something';
                when(accessMock(join(UPLOAD_PATH, mockedFilename), constants.R_OK)).thenReject(new Error('FAIL'));

                when(filenameByGuidMock(guid)).thenReturn(mockedFilename);

                return request(app)
                    .get(`/get/${guid}`)
                    .expect(404)
                    .expect('Content-Type', /json/u)
                    .expect(checkNotFoundResponse);
            });

            it('should return the file when it exists', async function () {
                const guid = '00000000-0000-0000-0000-000000000000';
                const file = resolve(`${__dirname}/../../fixtures/0057B7.png`);
                const buffer = await readFile(file);
                when(accessMock(file, constants.R_OK)).thenResolve();
                when(filenameByGuidMock(guid)).thenReturn(`/../${file}`); // `..` accounts for UPLOAD_DIR: /somewhere/../path/to/file
                return request(app)
                    .get(`/get/${guid}`)
                    .expect(200)
                    .expect('Content-Type', /image\/png/u)
                    .expect((res) => expect(res.body).to.deep.equal(buffer));
            });
        });
    });

    describe('retrieveCompareHandler', function () {
        describe('Error handling', function () {
            it('should fail on a bad GUID', function () {
                return request(app)
                    .get('/get/Z0000000-0000-0000-0000-000000000000/1')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on a bad number', function () {
                return request(app)
                    .get('/get/00000000-0000-0000-0000-000000000000/Z')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on a too large number', function () {
                return request(app)
                    .get('/get/00000000-0000-0000-0000-000000000000/100')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });
        });

        describe('Normal operation', function () {
            it('should handle "File not found" condition', function () {
                const guid = '00000000-0000-0000-0000-000000000000';
                const photoNumber = 1;

                const mockedFilename = 'something';
                when(accessMock(join(UPLOAD_PATH, mockedFilename), constants.R_OK)).thenReject(new Error('FAIL'));

                when(filenameByGuidMock(`${guid}-${photoNumber}`)).thenReturn(mockedFilename);

                return request(app)
                    .get(`/get/${guid}/${photoNumber}`)
                    .expect(404)
                    .expect('Content-Type', /json/u)
                    .expect(checkNotFoundResponse);
            });

            it('should return the file when it exists', async function () {
                const guid = '00000000-0000-0000-0000-000000000000';
                const photoNumber = 1;
                const file = resolve(`${__dirname}/../../fixtures/FFD700.png`);
                const buffer = await readFile(file);
                when(accessMock(file, constants.R_OK)).thenResolve();
                when(filenameByGuidMock(`${guid}-${photoNumber}`)).thenReturn(`/../${file}`); // `..` accounts for UPLOAD_DIR: /somewhere/../path/to/file

                return request(app)
                    .get(`/get/${guid}/${photoNumber}`)
                    .expect(200)
                    .expect('Content-Type', /^image\/png/u)
                    .expect((res) => expect(res.body).to.deep.equal(buffer));
            });
        });
    });

    describe('countHandler', function () {
        describe('Error handling', function () {
            it('should fail on a bad GUID', function () {
                return request(app)
                    .get('/count/Z0000000-0000-0000-0000-000000000000')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });
        });

        describe('Normal operation', function () {
            it('should behave correctly', function () {
                const guid = '00000000-0000-0000-0000-000000000000';
                const filemask = 'blah';

                when(globMock(join(UPLOAD_PATH, filemask), matchers.isA(Object) as fastGlob.Options)).thenResolve([]);
                when(filenameByGuidMock(guid, '-*.jpg')).thenReturn(filemask);

                const expected = {
                    success: true,
                    files: 0,
                };

                return request(app).get(`/count/${guid}`).expect(200).expect('Content-Type', /json/u).expect(expected);
            });
        });
    });
});
