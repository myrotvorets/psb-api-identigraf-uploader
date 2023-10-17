export interface ImageServiceInterface {
    resize(input: NodeJS.ReadableStream, size: number): NodeJS.ReadableStream;
    webp(input: NodeJS.ReadableStream): NodeJS.ReadableStream;
}
