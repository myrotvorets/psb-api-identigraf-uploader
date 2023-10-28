export interface ImageServiceInterface {
    autoRotate(input: NodeJS.ReadableStream): NodeJS.ReadableStream;
    resize(input: NodeJS.ReadableStream, size: number): NodeJS.ReadableStream;
    webp(input: NodeJS.ReadableStream): NodeJS.ReadableStream;
    convertToJpeg(input: NodeJS.ReadableStream): Promise<NodeJS.ReadableStream>;
}
