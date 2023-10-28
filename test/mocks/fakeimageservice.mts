import type { ImageServiceInterface } from '../services/imageserviceinterface.mjs';

export class FakeImageService implements ImageServiceInterface {
    public autoRotate(input: NodeJS.ReadableStream): NodeJS.ReadableStream {
        return input;
    }

    public resize(input: NodeJS.ReadableStream, _size: number): NodeJS.ReadableStream {
        return input;
    }

    public webp(input: NodeJS.ReadableStream): NodeJS.ReadableStream {
        return input;
    }

    public convertToJpeg(input: NodeJS.ReadableStream): Promise<NodeJS.ReadableStream> {
        return Promise.resolve(input);
    }
}
