export interface DownloadServiceInterface {
    getFile(guid: string, n?: number | undefined): NodeJS.ReadableStream;
    countFiles(guid: string): Promise<number>;
}
