export interface DownloadServiceInterface {
    getFile(guid: string, n?: number): NodeJS.ReadableStream;
    countFiles(guid: string): Promise<number>;
}
