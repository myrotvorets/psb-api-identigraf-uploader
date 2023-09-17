import type { Metadata } from 'sharp';

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
