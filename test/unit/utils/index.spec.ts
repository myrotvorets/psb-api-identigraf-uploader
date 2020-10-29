import '../../helpers/mockfs';
import fs from 'fs';
import { unlink } from '../../../src/utils';

const mockedUnlink = fs.promises.unlink as jest.MockedFunction<typeof fs.promises.unlink>;
console.warn = jest.fn();

beforeEach(() => jest.clearAllMocks());

describe('unlink', () => {
    beforeEach(() => mockedUnlink.mockResolvedValue());

    it('should return a Promise', () => {
        expect(unlink('something')).toEqual(expect.any(Promise));
    });

    it('should not print anything on success', () => {
        return unlink('something').then(() => {
            expect(console.warn).toHaveBeenCalledTimes(0);
        });
    });

    it('should print a warning on failure', () => {
        mockedUnlink.mockRejectedValue(new Error('VERY FATAL ERROR'));
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
