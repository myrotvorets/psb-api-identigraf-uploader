import { sep } from 'node:path';
import { expect } from 'chai';
import type { UploadedFile } from '../../../src/services/uploadserviceinterface.mjs';
import { UploadService } from '../../../src/services/uploadservice.mjs';
import { MemFSService } from '../../mocks/memfsfileservice.mjs';
import { FakeImageService } from '../../mocks/fakeimageservice.mjs';

const BASE_PATH = process.env['IDENTIGRAF_UPLOAD_FOLDER']!;

describe('UploadService', function () {
    describe('#uploadFile()', function () {
        let service: UploadService;
        let fileService: MemFSService;

        before(function () {
            fileService = new MemFSService();
            service = new UploadService({
                basePath: BASE_PATH,
                fileService: fileService,
                imageService: new FakeImageService(),
            });
        });

        beforeEach(function () {
            fileService.reset();
        });

        const guid = 'd2a4b27c-1d11-472a-826e-e953bb2a2a21';

        it('should upload files (search)', async function () {
            const file: UploadedFile = {
                path: '',
                destination: BASE_PATH,
                buffer: Buffer.from('test'),
            };

            const expectedPath = `${BASE_PATH}${sep}d2${sep}a4${sep}b2${sep}${guid}.jpg`;

            await service.uploadFile(file, guid);

            const volume = fileService.volume;
            expect(volume).to.be.an('object').and.have.property(expectedPath, file.buffer.toString());
        });

        it('should upload files (compare)', async function () {
            const file: UploadedFile = {
                path: '',
                destination: BASE_PATH,
                buffer: Buffer.from('test'),
            };

            const fileNo = 1;
            const expectedPath = `${BASE_PATH}${sep}d2${sep}a4${sep}b2${sep}${guid}-${fileNo}.jpg`;

            await service.uploadFile(file, guid, fileNo);

            const volume = fileService.volume;
            expect(volume).to.be.an('object').and.have.property(expectedPath, file.buffer.toString());
        });

        it('should produce JPG files', async function () {
            const file: UploadedFile = {
                // eslint-disable-next-line sonarjs/publicly-writable-directories -- fake path for tests
                path: '/tmp/xxx.png',
                destination: BASE_PATH,
                buffer: Buffer.from(''),
            };

            const expectedPath = `${BASE_PATH}${sep}d2${sep}a4${sep}b2${sep}${guid}.jpg`;
            const expectedContent = 'test';

            fileService.populate({ [file.path]: expectedContent });

            await service.uploadFile(file, guid);

            const volume = fileService.volume;
            expect(volume).to.be.an('object').and.have.property(expectedPath, expectedContent);
        });
    });
});
