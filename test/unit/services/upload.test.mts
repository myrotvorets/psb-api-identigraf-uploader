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

        it('should handle non-progressive 4:2:0 JPEGs', function () {
            when(metadataMock()).thenResolve(normalMetadata);

            return service.uploadFile(file, guid).then((s) => {
                commonChecks(s);
                verify(jpegMock(), { times: 0 });
            });
        });

        it('should handle PNGs', function () {
            when(metadataMock()).thenResolve(metadataPng);
            return service.uploadFile(file, guid).then((s) => {
                commonChecks(s);
                jpegChecks();
            });
        });

        it('should handle all other JPEGs', function () {
            when(metadataMock()).thenResolve(metadataOtherJpeg);
            return service.uploadFile(file, guid).then((s) => {
                commonChecks(s);
                jpegChecks();
            });
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

        const guids = [
            ['837c4760-c8e6-4e17-b1dd-f8e708e79978', `83${sep}7c${sep}47${sep}837c4760-c8e6-4e17-b1dd-f8e708e79978`],
            ['ba200c7f-8e33-4f9e-b15e-fa430ce369c6', `ba${sep}20${sep}0c${sep}ba200c7f-8e33-4f9e-b15e-fa430ce369c6`],
            ['edaa2df6-b3d9-4192-b99b-37a0a4689980', `ed${sep}aa${sep}2d${sep}edaa2df6-b3d9-4192-b99b-37a0a4689980`],
            ['fed76ad9-4078-471c-8f2a-885f275ea204', `fe${sep}d7${sep}6a${sep}fed76ad9-4078-471c-8f2a-885f275ea204`],
            ['f9c77be1-dfba-4f21-96d7-96bf6faa3a1d', `f9${sep}c7${sep}7b${sep}f9c77be1-dfba-4f21-96d7-96bf6faa3a1d`],
        ];

        // eslint-disable-next-line mocha/no-setup-in-describe
        guids.forEach(([input, expected]) => {
            it(`should split the GUID into parts (${input} => ${expected})`, function () {
                const actual = service.filenameByGuid(input, '');
                expect(actual).to.equal(expected);
            });
        });
    });
});
