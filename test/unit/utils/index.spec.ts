import '../../helpers/mockfs';
import fs from 'fs';
import { normalizeFiles, unlink } from '../../../src/utils';

const mockedUnlink = fs.promises.unlink as jest.MockedFunction<typeof fs.promises.unlink>;
const warn = console.warn;

beforeEach(() => {
    jest.clearAllMocks();
    mockedUnlink.mockReset();
});

afterEach(() => {
    console.warn = warn;
});

describe('unlink', () => {
    beforeEach(() => mockedUnlink.mockResolvedValue());

    it('should return a Promise', () => {
        expect(unlink('something')).toEqual(expect.any(Promise));
    });

    it('should not print anything on success', () => {
        console.warn = jest.fn();
        return unlink('something').then(() => {
            expect(console.warn).toHaveBeenCalledTimes(0);
        });
    });

    it('should print a warning on failure', () => {
        console.warn = jest.fn();
        mockedUnlink.mockRejectedValueOnce(new Error('VERY FATAL ERROR'));
        const file = 'non-existing-file';
        return unlink(file).then(() => {
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining(file),
                expect.objectContaining({ message: 'VERY FATAL ERROR' }),
            );
        });
    });
});

describe('normalizeFiles', () => {
    it('should handle the case with no files', () => {
        const input = {};
        const expected: ReturnType<typeof normalizeFiles> = [];
        const actual = normalizeFiles(input);
        expect(actual).toStrictEqual(expected);
    });

    it('should handle the case when `file` is set', () => {
        const input = {
            file: { path: 'somepath' },
        };

        const expected = [input.file];
        const actual = normalizeFiles(input);
        expect(actual).toStrictEqual(expected);
    });

    it('should handle the case when `files` is an empty array', () => {
        const input = {
            files: [],
        };
        const expected: ReturnType<typeof normalizeFiles> = input.files;
        const actual = normalizeFiles(input);
        expect(actual).toStrictEqual(expected);
    });

    it('should handle the case when `files` is an array', () => {
        const input = {
            files: [{ path: 'somepath' }],
        };

        const expected: ReturnType<typeof normalizeFiles> = input.files;
        const actual = normalizeFiles(input);
        expect(actual).toStrictEqual(expected);
    });

    it('should handle the case when `files` is an object', () => {
        const input = {
            files: {
                key1: [{ path: '1.1' }, { path: '1.2' }],
                key2: [],
                key3: [{ path: '3.1' }],
                key4: [{ path: '4.1' }, { path: '4.2' }, { path: '4.3' }],
            },
        };

        const expected = [
            { path: '1.1' },
            { path: '1.2' },
            { path: '3.1' },
            { path: '4.1' },
            { path: '4.2' },
            { path: '4.3' },
        ];

        const actual = normalizeFiles(input);
        expect(actual).toStrictEqual(expected);
    });
});
