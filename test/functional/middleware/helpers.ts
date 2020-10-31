import type { Readable } from 'stream';
import type multer from 'multer';

export const multerSingle = jest.fn();
export const multerArray = jest.fn();

export const multerImplementation = (): multer.Multer => ({
    single: multerSingle,
    array: multerArray,
    fields: jest.fn(),
    any: jest.fn(),
    none: jest.fn(),
});

export const file: Express.Multer.File = {
    path: '/somewhere/between/the/sacred/silence/and/sleep',
    fieldname: 'fieldname',
    originalname: 'originalname',
    encoding: '',
    size: 1,
    mimetype: 'image/jpeg',
    destination: '/',
    filename: 'filename',
    buffer: (undefined as unknown) as Buffer,
    stream: (undefined as unknown) as Readable,
};
