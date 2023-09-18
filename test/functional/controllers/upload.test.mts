import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as promises from 'node:fs/promises';
import { constants, readFile } from 'node:fs/promises';
import { beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import * as td from 'testdouble';
import express, { type Express } from 'express';
import request from 'supertest';
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

describe('Upload', () => {
    let app: Express;
    let upload: typeof uploader;
    const env = { ...process.env };

    const accessMock = td.function<typeof import('node:fs/promises').access>();
    const mkDirMock = td.function<typeof import('node:fs/promises').mkdir>();
    const globMock = td.function();
    const metadataMock = td.function();
    const filenameByGuidMock = td.function();

    beforeEach(async () => {
        td.when(metadataMock()).thenResolve({ format: 'jpeg', chromaSubsampling: '4:2:0', isProgressive: true });

        await td.replaceEsm('sharp', {
            default: () => ({
                metadata: metadataMock,
                jpeg: td.function(),
                toFile: td.function(),
                rotate: td.function(),
            }),
        });

        await td.replaceEsm('node:fs/promises', {
            ...promises,
            access: accessMock,
            mkdir: mkDirMock,
        });

        await td.replaceEsm('fast-glob', null, globMock);

        upload = await import('../../../src/services/upload.mjs');
        const { configureApp } = await import('../../../src/server.mjs');

        td.replace(upload.UploadService, 'filenameByGuid', filenameByGuidMock);

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

            it('should fail on a bad GUID', () => {
                return request(app)
                    .post('/search/Z0000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'image/png')
                    .attach('photo', `${__dirname}/../../fixtures/0057B7.png`)
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
        describe('Error handling', () => {
            it('should fail on empty upload (no Content-Type)', () => {
                return request(app)
                    .post('/compare/00000000-0000-0000-0000-000000000000')
                    .expect(415)
                    .expect('Content-Type', /json/u)
                    .expect(checkUnsupportedMediaType);
            });

            it('should fail on empty upload (with Content-Type)', () => {
                return request(app)
                    .post('/compare/00000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'image/png')
                    .expect(415)
                    .expect('Content-Type', /json/u)
                    .expect(checkUnsupportedMediaType);
            });

            it('should fail on one file', () => {
                return request(app)
                    .post('/compare/00000000-0000-0000-0000-000000000000')
                    .attach('photo', `${__dirname}/../../fixtures/0057B7.png`)
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on too many files', () => {
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

            it('should fail on a bad GUID', () => {
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
        describe('Error handling', () => {
            it('should fail on a bad GUID', () => {
                return request(app)
                    .get('/get/Z0000000-0000-0000-0000-000000000000')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });
        });

        describe('Normal operation', () => {
            it('should handle "File not found" condition', () => {
                const guid = '00000000-0000-0000-0000-000000000000';
                const mockedFilename = '/something';
                td.when(accessMock(join(UPLOAD_PATH, mockedFilename), constants.R_OK)).thenReject(new Error('FAIL'));

                td.when(filenameByGuidMock(guid)).thenReturn(mockedFilename);

                return request(app)
                    .get(`/get/${guid}`)
                    .expect(404)
                    .expect('Content-Type', /json/u)
                    .expect(checkNotFoundResponse);
            });

            it('should return the file when it exists', async () => {
                const guid = '00000000-0000-0000-0000-000000000000';
                const file = resolve(`${__dirname}/../../fixtures/0057B7.png`);
                const buffer = await readFile(file);
                td.when(accessMock(file, constants.R_OK)).thenResolve();
                td.when(filenameByGuidMock(guid)).thenReturn(`/../${file}`); // `..` accounts for UPLOAD_DIR: /somewhere/../path/to/file
                return request(app)
                    .get(`/get/${guid}`)
                    .expect(200)
                    .expect('Content-Type', /image\/png/u)
                    .expect((res) => expect(res.body).to.deep.equal(buffer));
            });
        });
    });

    describe('retrieveCompareHandler', () => {
        describe('Error handling', () => {
            it('should fail on a bad GUID', () => {
                return request(app)
                    .get('/get/Z0000000-0000-0000-0000-000000000000/1')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on a bad number', () => {
                return request(app)
                    .get('/get/00000000-0000-0000-0000-000000000000/Z')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on a too large number', () => {
                return request(app)
                    .get('/get/00000000-0000-0000-0000-000000000000/100')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });
        });

        describe('Normal operation', () => {
            it('should handle "File not found" condition', () => {
                const guid = '00000000-0000-0000-0000-000000000000';
                const photoNumber = 1;

                const mockedFilename = 'something';
                td.when(accessMock(join(UPLOAD_PATH, mockedFilename), constants.R_OK)).thenReject(new Error('FAIL'));

                td.when(filenameByGuidMock(`${guid}-${photoNumber}`)).thenReturn(mockedFilename);

                return request(app)
                    .get(`/get/${guid}/${photoNumber}`)
                    .expect(404)
                    .expect('Content-Type', /json/u)
                    .expect(checkNotFoundResponse);
            });

            it('should return the file when it exists', async () => {
                const guid = '00000000-0000-0000-0000-000000000000';
                const photoNumber = 1;
                const file = resolve(`${__dirname}/../../fixtures/FFD700.png`);
                const buffer = await readFile(file);
                td.when(accessMock(file, constants.R_OK)).thenResolve();
                td.when(filenameByGuidMock(`${guid}-${photoNumber}`)).thenReturn(`/../${file}`); // `..` accounts for UPLOAD_DIR: /somewhere/../path/to/file

                return request(app)
                    .get(`/get/${guid}/${photoNumber}`)
                    .expect(200)
                    .expect('Content-Type', /^image\/png/u)
                    .expect((res) => expect(res.body).to.deep.equal(buffer));
            });
        });
    });

    describe('countHandler', () => {
        describe('Error handling', () => {
            it('should fail on a bad GUID', () => {
                return request(app)
                    .get('/count/Z0000000-0000-0000-0000-000000000000')
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });
        });

        describe('Normal operation', () => {
            it('should behave correctly', () => {
                const guid = '00000000-0000-0000-0000-000000000000';
                const filemask = 'blah';

                td.when(globMock(join(UPLOAD_PATH, filemask), td.matchers.isA(Object))).thenResolve([]);
                td.when(filenameByGuidMock(guid, '-*.jpg')).thenReturn(filemask);

                const expected = {
                    success: true,
                    files: 0,
                };

                return request(app).get(`/count/${guid}`).expect(200).expect('Content-Type', /json/u).expect(expected);
            });
        });
    });
});
