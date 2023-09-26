import { sep } from 'node:path';
import * as promises from 'node:fs/promises';
import type { MakeDirectoryOptions } from 'node:fs';
import { expect } from 'chai';
import { type TestDouble, func, matchers, replaceEsm, verify, when } from 'testdouble';
import type { JpegOptions, Sharp } from 'sharp';
import type { UploadService } from '../../../src/services/upload.mjs';
import { metadataOtherJpeg, metadataPng, normalMetadata } from './fixtures.mjs';

describe('UploadService', function () {
    describe('uploadFile()', function () {
        let service: typeof UploadService;
        let mkdirMock: TestDouble<typeof promises.mkdir>;
        let metadataMock: TestDouble<Sharp['metadata']>;
        let jpegMock: TestDouble<Sharp['jpeg']>;
        let toFileMock: TestDouble<Sharp['toFile']>;
        let rotateMock: TestDouble<Sharp['rotate']>;
        let file: Pick<Express.Multer.File, 'path' | 'destination' | 'buffer'>;

        before(function () {
            mkdirMock = func<typeof promises.mkdir>();
            metadataMock = func<Sharp['metadata']>();
            jpegMock = func<Sharp['jpeg']>();
            toFileMock = func<Sharp['toFile']>();
            rotateMock = func<Sharp['rotate']>();

            file = {
                path: 'some-file.xxx',
                destination: `${sep}somewhere`,
                buffer: Buffer.from(''),
            };
        });

        beforeEach(async function () {
            await replaceEsm('node:fs/promises', { ...promises, mkdir: mkdirMock });
            await replaceEsm('sharp', {
                default: () => ({
                    metadata: metadataMock,
                    jpeg: jpegMock,
                    toFile: toFileMock,
                    rotate: rotateMock,
                }),
            });

            const svc = await import('../../../src/services/upload.mjs');
            service = svc.UploadService;
        });

        const guid = 'd2a4b27c-1d11-472a-826e-e953bb2a2a21';

        const commonChecks = (s: string): void => {
            const expectedPrefix = `d2${sep}a4${sep}b2`;
            const expectedRetVal = `${expectedPrefix}${sep}d2a4b27c-1d11-472a-826e-e953bb2a2a21.jpg`;

            verify(
                mkdirMock(`${file.destination}${sep}${expectedPrefix}`, matchers.isA(Object) as MakeDirectoryOptions),
                { times: 1 },
            );

            verify(rotateMock(), { times: 1 });
            expect(s).to.equal(expectedRetVal);
        };

        const jpegChecks = (): void => {
            verify(
                jpegMock(
                    matchers.contains({
                        progressive: false,
                        chromaSubsampling: '4:2:0',
                    }) as JpegOptions,
                ),
                { times: 1 },
            );
        };

        it('should handle non-progressive 4:2:0 JPEGs', async function () {
            when(metadataMock()).thenResolve(normalMetadata);

            const s = await service.uploadFile(file, guid);
            commonChecks(s);
            verify(jpegMock(), { times: 0 });
        });

        it('should handle PNGs', async function () {
            when(metadataMock()).thenResolve(metadataPng);

            const s = await service.uploadFile(file, guid);
            commonChecks(s);
            jpegChecks();
        });

        it('should handle all other JPEGs', async function () {
            when(metadataMock()).thenResolve(metadataOtherJpeg);

            const s = await service.uploadFile(file, guid);
            commonChecks(s);
            jpegChecks();
        });
    });

    describe('filenameByGuid()', function () {
        let service: typeof UploadService;

        beforeEach(async function () {
            const svc = await import('../../../src/services/upload.mjs');
            service = svc.UploadService;
        });

        it('should append a default extension', function () {
            const guid = '373a9c21-4155-45c8-b2db-0b1a0c40641c';
            expect(service.filenameByGuid(guid)).to.match(/\.jpg$/u);
        });

        it('should split the GUID into parts', function () {
            const input = '837c4760-c8e6-4e17-b1dd-f8e708e79978';
            const expected = `83${sep}7c${sep}47${sep}837c4760-c8e6-4e17-b1dd-f8e708e79978`;
            const actual = service.filenameByGuid(input, '');
            expect(actual).to.equal(expected);
        });

        it('should reject invalid input', function () {
            expect(() => service.filenameByGuid('guid', '')).to.throw(TypeError);
        });
    });
});
