import type { Metadata, Sharp } from 'sharp';

export const metadataMock = jest.fn();
export const jpegMock = jest.fn();
export const toFileMock = jest.fn().mockResolvedValue('');

export const sharpImplementation = (): Sharp => {
    return ({
        metadata: metadataMock,
        jpeg: jpegMock,
        toFile: toFileMock,
    } as unknown) as Sharp;
};

export const normalMetadata: Metadata = {
    format: 'jpeg',
    chromaSubsampling: '4:2:0',
    isProgressive: false,
};

export const metadataPng: Metadata = {
    format: 'png',
    chromaSubsampling: '',
    isProgressive: false,
};

export const metadataOtherJpeg: Metadata = {
    format: 'jpeg',
    chromaSubsampling: '4:4:4',
    isProgressive: true,
};
