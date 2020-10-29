import '../../helpers/mockfs';
import fs from 'fs';
import { sep } from 'path';
import sharp from 'sharp';
import { UploadService } from '../../../src/services/upload';
import { jpegMock, metadataMock, metadataOtherJpeg, metadataPng, normalMetadata, sharpImplementation } from './helpers';

jest.mock('sharp');

const mockedMkDir = fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>;
const mockedSharp = sharp as jest.MockedFunction<typeof sharp>;

beforeEach(() => jest.clearAllMocks());

describe('UploadService', () => {
    describe('uploadFile()', () => {
        beforeEach(() => mockedMkDir.mockResolvedValue('whatever'));

        const file = {
            path: 'some-file.xxx',
            destination: `${sep}somewhere`,
        };

        const guid = 'd2a4b27c-1d11-472a-826e-e953bb2a2a21';
        const expectedPrefix = `d2${sep}a4${sep}b2`;
        const expectedRetVal = `${expectedPrefix}${sep}d2a4b27c-1d11-472a-826e-e953bb2a2a21.jpg`;

        const commonChecks = (s: string): void => {
            expect(mockedSharp).toHaveBeenCalledTimes(1);
            expect(mockedMkDir).toHaveBeenCalledTimes(1);
            expect(mockedMkDir).toHaveBeenCalledWith(`${file.destination}${sep}${expectedPrefix}`, expect.any(Object));
            expect(metadataMock).toHaveBeenCalledTimes(1);
            expect(s).toBe(expectedRetVal);
        };

        const jpegChecks = (): void => {
            expect(jpegMock).toHaveBeenCalledTimes(1);
            expect(jpegMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    progressive: false,
                    chromaSubsampling: '4:2:0',
                }),
            );
        };

        it('should handle non-progressive 4:2:0 JPEGs', () => {
            mockedSharp.mockImplementation(sharpImplementation);
            metadataMock.mockResolvedValue(normalMetadata);
            return UploadService.uploadFile(file, guid).then((s) => {
                commonChecks(s);
                expect(jpegMock).toHaveBeenCalledTimes(0);
            });
        });

        it('should handle PNGs', () => {
            mockedSharp.mockImplementation(sharpImplementation);
            metadataMock.mockResolvedValue(metadataPng);
            return UploadService.uploadFile(file, guid).then((s) => {
                commonChecks(s);
                jpegChecks();
            });
        });

        it('should handle all other JPEgs', () => {
            mockedSharp.mockImplementation(sharpImplementation);
            metadataMock.mockResolvedValue(metadataOtherJpeg);
            return UploadService.uploadFile(file, guid).then((s) => {
                commonChecks(s);
                jpegChecks();
            });
        });
    });

    describe('filenameByGuid()', () => {
        it('should append a default extension', () => {
            const guid = '373a9c21-4155-45c8-b2db-0b1a0c40641c';
            expect(UploadService.filenameByGuid(guid)).toEqual(expect.stringMatching(/\.jpg$/u));
        });

        it.each([
            ['837c4760-c8e6-4e17-b1dd-f8e708e79978', `83${sep}7c${sep}47${sep}837c4760-c8e6-4e17-b1dd-f8e708e79978`],
            ['ba200c7f-8e33-4f9e-b15e-fa430ce369c6', `ba${sep}20${sep}0c${sep}ba200c7f-8e33-4f9e-b15e-fa430ce369c6`],
            ['edaa2df6-b3d9-4192-b99b-37a0a4689980', `ed${sep}aa${sep}2d${sep}edaa2df6-b3d9-4192-b99b-37a0a4689980`],
            ['fed76ad9-4078-471c-8f2a-885f275ea204', `fe${sep}d7${sep}6a${sep}fed76ad9-4078-471c-8f2a-885f275ea204`],
            ['f9c77be1-dfba-4f21-96d7-96bf6faa3a1d', `f9${sep}c7${sep}7b${sep}f9c77be1-dfba-4f21-96d7-96bf6faa3a1d`],
        ])('should split the GUID into parts (%s => %s)', (input, expected) => {
            const actual = UploadService.filenameByGuid(input, '');
            expect(actual).toBe(expected);
        });
    });
});
