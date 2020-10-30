import type { Readable } from 'stream';
import type multer from 'multer';
import type { Response } from 'supertest';
import type { ErrorResponse } from '@myrotvorets/express-microservice-middlewares';

export const multerSingle = jest.fn();
export const multerArray = jest.fn();

export function multerImplementation(this: Record<string, unknown>): multer.Multer {
    return {
        single: multerSingle,
        array: multerArray,
        fields: jest.fn(),
        any: jest.fn(),
        none: jest.fn(),
    };
}

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

function checkErrorCode(res: Response, expectedCode: string): void {
    expect(res.body).not.toEqual({});
    expect(res.body).toHaveProperty('code');
    expect((res.body as ErrorResponse).code).toBe(expectedCode);
}

export const checkNoFiles = (res: Response): void => checkErrorCode(res, 'NO_FILES');
export const checkTooFewFiles = (res: Response): void => checkErrorCode(res, 'TOO_FEW_FILES');
export const checkUnsupportedFile = (res: Response): void => checkErrorCode(res, 'UNSUPPORTED_FILE');
export const checkEmptyFile = (res: Response): void => checkErrorCode(res, 'EMPTY_FILE');
