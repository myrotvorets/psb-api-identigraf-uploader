/* eslint-disable sonarjs/assertions-in-tests */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { type Express } from 'express';
import request, { type Response } from 'supertest';
import { asFunction } from 'awilix';
import { configureApp, createApp } from '../../../src/server.mjs';
import { container } from '../../../src/lib/container.mjs';
import { MemFSService } from '../../mocks/memfsfileservice.mjs';

const thisDir = dirname(fileURLToPath(import.meta.url));

function checkError(res: Response, expectedStatus: number, expectedCode: string): void {
    expect(res.body).to.be.an('object').and.include({
        code: expectedCode,
        status: expectedStatus,
    });
}

const checkUnsupportedMediaType = (res: Response): void => checkError(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
const checkBadRequest = (res: Response): void => checkError(res, 400, 'BAD_REQUEST');

describe('Upload', function () {
    let app: Express;

    function createMemFSService(): MemFSService {
        return new MemFSService();
    }

    before(async function () {
        await container.dispose();
        app = createApp();
        configureApp(app);
        container.register('fileService', asFunction(createMemFSService).singleton());
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
                    .attach('photo', `${thisDir}/../../fixtures/0057B7.png`)
                    .attach('photo', `${thisDir}/../../fixtures/FFD700.png`)
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on a bad GUID', function () {
                return request(app)
                    .post('/search/Z0000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'image/png')
                    .attach('photo', `${thisDir}/../../fixtures/0057B7.png`)
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
                    .attach('photo', `${thisDir}/../../fixtures/0057B7.png`)
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
                    .attach('photo', `${thisDir}/../../fixtures/0057B7.png`)
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on too many files', function () {
                return request(app)
                    .post('/compare/00000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'multipart/form-data')
                    .attach('photos', `${thisDir}/../../fixtures/0057B7.png`)
                    .attach('photos', `${thisDir}/../../fixtures/FFD700.png`)
                    .attach('photos', `${thisDir}/../../fixtures/0057B7.png`)
                    .attach('photos', `${thisDir}/../../fixtures/FFD700.png`)
                    .attach('photos', `${thisDir}/../../fixtures/0057B7.png`)
                    .attach('photos', `${thisDir}/../../fixtures/FFD700.png`)
                    .attach('photos', `${thisDir}/../../fixtures/0057B7.png`)
                    .attach('photos', `${thisDir}/../../fixtures/FFD700.png`)
                    .attach('photos', `${thisDir}/../../fixtures/0057B7.png`)
                    .attach('photos', `${thisDir}/../../fixtures/FFD700.png`)
                    .attach('photos', `${thisDir}/../../fixtures/0057B7.png`)
                    .attach('photos', `${thisDir}/../../fixtures/FFD700.png`)
                    .expect(400)
                    .expect('Content-Type', /json/u)
                    .expect(checkBadRequest);
            });

            it('should fail on a bad GUID', function () {
                return request(app)
                    .post('/compare/Z0000000-0000-0000-0000-000000000000')
                    .set('Content-Type', 'multipart/form-data')
                    .attach('photos', `${thisDir}/../../fixtures/0057B7.png`)
                    .attach('photos', `${thisDir}/../../fixtures/FFD700.png`)
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
                    .attach('photos', `${thisDir}/../../fixtures/0057B7.png`)
                    .attach('photos', `${thisDir}/../../fixtures/FFD700.png`)
                    .expect(200)
                    .expect('Content-Type', /json/u)
                    .expect({ success: true });
            });
        });
    });
});
