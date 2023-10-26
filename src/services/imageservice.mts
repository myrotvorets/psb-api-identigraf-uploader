import sharp, { type Sharp } from 'sharp';
import { ImageServiceInterface } from './imageserviceinterface.mjs';

export class ImageService implements ImageServiceInterface {
    public autoRotate(input: NodeJS.ReadableStream): NodeJS.ReadableStream {
        return this.sharpenStream(input).rotate();
    }

    public resize(input: NodeJS.ReadableStream, size: number): NodeJS.ReadableStream {
        return this.sharpenStream(input).resize({
            width: size,
            height: size,
            fit: 'inside',
            withoutEnlargement: true,
        });
    }

    public webp(input: NodeJS.ReadableStream): NodeJS.ReadableStream {
        return this.sharpenStream(input).webp();
    }

    private sharpenStream(input: NodeJS.ReadableStream): Sharp {
        if (input instanceof sharp) {
            return input as Sharp;
        }

        const img = sharp({ sequentialRead: true });
        return input.pipe(img);
    }
}
