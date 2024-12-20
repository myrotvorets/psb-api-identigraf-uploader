/* eslint-disable sonarjs/no-nested-functions */
import type { RequestListener } from 'node:http';
import { dirname, resolve } from 'node:path';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect } from 'chai';
import request, { type Response } from 'supertest';
import { asClass } from 'awilix';
import { container } from '../../../src/lib/container.mjs';
import { configureApp, createApp } from '../../../src/server.mjs';
import { FakeFileService, createReadStreamMock } from '../../mocks/fakefileservice.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function checkError(res: Response, expectedStatus: number, expectedCode: string): void {
    expect(res.body).to.be.an('object').and.include({
        code: expectedCode,
        status: expectedStatus,
    });
}

const checkBadRequest = (res: Response): void => checkError(res, 400, 'BAD_REQUEST');
const checkNotFoundResponse = (res: Response): void => checkError(res, 404, 'NOT_FOUND');
const checkServerError = (res: Response): void => checkError(res, 500, 'UNKNOWN_ERROR');

const createErrorStream = (code: string): Readable =>
    new Readable({
        read(): void {
            const error: Error & { code?: string } = new Error('Not found');
            error.code = code;
            this.emit('error', error);
        },
    });

describe('Download', function () {
    let app: RequestListener;

    before(async function () {
        await container.dispose();
        const application = createApp();
        configureApp(application);
        app = application as RequestListener;
        container.register('fileService', asClass(FakeFileService).singleton());
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

                createReadStreamMock.mock.mockImplementationOnce(() => createErrorStream('ENOENT'));

                return request(app)
                    .get(`/get/${guid}`)
                    .expect(404)
                    .expect('Content-Type', /json/u)
                    .expect(checkNotFoundResponse);
            });

            it('should handle other errors', function () {
                const guid = '00000000-0000-0000-0000-000000000000';

                createReadStreamMock.mock.mockImplementationOnce(() => createErrorStream('EACCESS'));

                return request(app)
                    .get(`/get/${guid}`)
                    .expect(500)
                    .expect('Content-Type', /json/u)
                    .expect(checkServerError);
            });

            it('should return the file when it exists', async function () {
                const guid = '00000000-0000-0000-0000-000000000000';
                const file = resolve(`${__dirname}/../../fixtures/0057B7.png`);
                const buffer = await readFile(file);

                createReadStreamMock.mock.mockImplementationOnce(() => createReadStream(file));

                return request(app)
                    .get(`/get/${guid}`)
                    .expect(200)
                    .expect('Content-Type', /image\/jpeg/u)
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

                createReadStreamMock.mock.mockImplementationOnce(() => createErrorStream('ENOENT'));

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

                createReadStreamMock.mock.mockImplementationOnce(() => createReadStream(file));

                return request(app)
                    .get(`/get/${guid}/${photoNumber}`)
                    .expect(200)
                    .expect('Content-Type', /^image\/jpeg/u)
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

                const expected = {
                    success: true,
                    files: 0,
                };

                return request(app).get(`/count/${guid}`).expect(200).expect('Content-Type', /json/u).expect(expected);
            });
        });
    });
});
