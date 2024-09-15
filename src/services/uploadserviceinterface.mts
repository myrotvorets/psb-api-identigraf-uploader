export type UploadedFile = Pick<Express.Multer.File, 'path' | 'destination' | 'buffer'>;

export interface UploadServiceInterface {
    uploadFile(file: UploadedFile, guid: string, n?: number): Promise<string>;
}
