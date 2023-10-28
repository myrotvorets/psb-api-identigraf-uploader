import { expect } from 'chai';
import { hashGuid } from '../../../src/lib/utils.mjs';

describe('utils', function () {
    describe('#hashGuid()', function () {
        it('should hash GUIDs', function () {
            const expected = 'bd/6e/95';
            const actual = hashGuid('bd6e9581-67e0-467f-986e-aa0baa77e43e');

            return expect(actual).to.equal(expected);
        });

        it('should throw an error if GUID is invalid', function () {
            const fn = (): string => hashGuid('invalid');

            return expect(fn).to.throw(TypeError);
        });
    });
});
