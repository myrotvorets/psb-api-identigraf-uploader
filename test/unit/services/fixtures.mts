import type { Metadata } from 'sharp';

export const normalMetadata: Partial<Metadata> = {
    format: 'jpeg',
    chromaSubsampling: '4:2:0',
    isProgressive: false,
};

export const metadataPng: Partial<Metadata> = {
    format: 'png',
    chromaSubsampling: '',
    isProgressive: false,
};

export const metadataOtherJpeg: Partial<Metadata> = {
    format: 'jpeg',
    chromaSubsampling: '4:4:4',
    isProgressive: true,
};
