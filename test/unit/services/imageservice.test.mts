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
const jpeg = `${basedir}/../../fixtures/p5.jpg`;

describe('ImageService', function () {
    let service: ImageService;
    let wideStream: ReadStream;
    let tallStream: ReadStream;
    let jpegStream: ReadStream;

    before(function () {
        service = new ImageService();
    });

    beforeEach(function () {
        wideStream = createReadStream(wide);
        tallStream = createReadStream(tall);
        jpegStream = createReadStream(jpeg);
    });

    describe('#resize()', function () {
        it('should not enlarge the image', async function () {
            const result = service.resize(wideStream, 400);
            const meta = await metadata(result);
            expect(meta).to.include({
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

    describe('#autorotate()', function () {
        it('should use EXIF to automatically orient images', function () {
            // width: 450, height: 300, orientation: 5
            const result = service.autoRotate(jpegStream);
            return expect(metadata(result))
                .to.eventually.include({
                    width: 300,
                    height: 450,
                    format: 'jpeg',
                })
                .and.not.have.property('orientation');
        });

        it('should not modify PNG files', function () {
            const result = service.autoRotate(wideStream);
            return expect(metadata(result)).to.eventually.include({
                width: 200,
                height: 100,
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

    describe('#convertToJpeg()', function () {
        it('should convert files to JPG', async function () {
            const result = await service.convertToJpeg(wideStream);
            const meta = await metadata(result);
            expect(meta).to.include({ format: 'jpeg' });
        });

        it('should not modify JPG files', function () {
            const result = service.convertToJpeg(jpegStream);
            return expect(result).to.eventually.equal(jpegStream);
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
