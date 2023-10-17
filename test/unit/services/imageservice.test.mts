import { ReadStream, createReadStream } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import sharp, { type Metadata } from 'sharp';
import { ImageService } from '../../../src/services/imageservice.mjs';

function metadata(stream: NodeJS.ReadableStream): Promise<Metadata> {
    const img = sharp();
    stream.pipe(img);
    return img.metadata();
}

const basedir = dirname(fileURLToPath(import.meta.url));
const wide = `${basedir}/../../fixtures/200x100.png`;
const tall = `${basedir}/../../fixtures/100x200.png`;

describe('ImageService', function () {
    let service: ImageService;
    let wideStream: ReadStream;
    let tallStream: ReadStream;

    before(function () {
        service = new ImageService();
    });

    beforeEach(function () {
        wideStream = createReadStream(wide);
        tallStream = createReadStream(tall);
    });

    describe('#resize()', function () {
        it('should not enlarge the image', async function () {
            const result = service.resize(wideStream, 400);
            return expect(metadata(result)).to.eventually.include({
                width: 200,
                height: 100,
                format: 'png',
            });
        });

        it('should proportionally resize wide images', function () {
            const result = service.resize(wideStream, 100);
            return expect(metadata(result)).to.eventually.include({
                width: 100,
                height: 50,
                format: 'png',
            });
        });

        it('should proportionally resize tall images', function () {
            const result = service.resize(tallStream, 50);
            return expect(metadata(result)).to.eventually.include({
                width: 25,
                height: 50,
                format: 'png',
            });
        });
    });

    describe('#webp()', function () {
        it('should generate webp', function () {
            const result = service.webp(wideStream);
            return expect(metadata(result)).to.eventually.include({
                format: 'webp',
            });
        });
    });

    it('combination of methods should work', function () {
        const result = service.webp(service.resize(wideStream, 100));
        return expect(metadata(result)).to.eventually.include({
            width: 100,
            height: 50,
            format: 'webp',
        });
    });
});
