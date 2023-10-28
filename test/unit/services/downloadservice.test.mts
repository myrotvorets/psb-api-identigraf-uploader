import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { streamToBuffer } from '@myrotvorets/buffer-stream';
import { DownloadService } from '../../../src/services/downloadservice.mjs';
import { MemFSService } from '../../mocks/memfsfileservice.mjs';

const BASE_PATH = process.env['IDENTIGRAF_UPLOAD_FOLDER']!;

describe('DownloadService', function () {
    let service: DownloadService;
    let fileService: MemFSService;
    let f1: Buffer;
    let f2: Buffer;
    let f3: Buffer;

    const searchGuid = 'd2a4b27c-1d11-472a-826e-e953bb2a2a21';
    const compareGuid = '5fb1f341-96d2-43f2-be1b-0f3c43867577';
    const anotherGuid = '00000000-0000-0000-0000-000000000000';

    before(async function () {
        const thisDir = dirname(fileURLToPath(import.meta.url));
        [f1, f2, f3] = await Promise.all([
            readFile(`${thisDir}/../../fixtures/0001.jpg`),
            readFile(`${thisDir}/../../fixtures/0002.jpg`),
            readFile(`${thisDir}/../../fixtures/0003.jpg`),
        ]);

        fileService = new MemFSService({
            [`${BASE_PATH}/00/00/00/something.jpg`]: 'test',
            [`${BASE_PATH}/d2/a4/b2/${searchGuid}.jpg`]: f1,
            [`${BASE_PATH}/5f/b1/f3/${compareGuid}-0.jpg`]: f2,
            [`${BASE_PATH}/5f/b1/f3/${compareGuid}-1.jpg`]: f3,
        });

        service = new DownloadService({
            basePath: BASE_PATH,
            fileService: fileService,
        });
    });

    describe('#getFile()', function () {
        it('should download files (search)', function () {
            const stream = service.getFile(searchGuid);
            const expected = f1;
            const actual = streamToBuffer(stream);

            return expect(actual).to.become(expected);
        });

        it('should download files (compare)', function () {
            const stream = service.getFile(compareGuid, 1);
            const expected = f3;
            const actual = streamToBuffer(stream);

            return expect(actual).to.become(expected);
        });
    });

    describe('#countFiles()', function () {
        it('should count files (search)', function () {
            const expected = 1;
            const actual = service.countFiles(searchGuid);

            return expect(actual).to.become(expected);
        });

        it('should count files (compare)', function () {
            const expected = 2;
            const actual = service.countFiles(compareGuid);

            return expect(actual).to.become(expected);
        });

        it('should filter out non-matching files', function () {
            const expected = 0;
            const actual = service.countFiles(anotherGuid);

            return expect(actual).to.become(expected);
        });
    });
});
