import { Environment, environment } from '../../../src/lib/environment';

describe('environment', () => {
    const env = { ...process.env };

    afterEach(() => (process.env = { ...env }));

    it('should not allow extra variables', () => {
        const expected: Environment = {
            NODE_ENV: 'development',
            PORT: 3000,
            IDENTIGRAF_UPLOAD_FOLDER: '/tmp',
            IDENTIGRAF_MAX_FILE_SIZE: 0,
        };

        process.env = {
            NODE_ENV: `${expected.NODE_ENV}`,
            PORT: `${expected.PORT}`,
            EXTRA: 'xxx',
            IDENTIGRAF_UPLOAD_FOLDER: `${expected.IDENTIGRAF_UPLOAD_FOLDER}`,
            IDENTIGRAF_MAX_FILE_SIZE: `${expected.IDENTIGRAF_MAX_FILE_SIZE}`,
        };

        const actual = { ...environment() };
        expect(actual).toStrictEqual(expected);
    });

    it('should cache the result', () => {
        const expected: Environment = {
            NODE_ENV: 'staging',
            PORT: 3030,
            IDENTIGRAF_UPLOAD_FOLDER: '/tmp',
            IDENTIGRAF_MAX_FILE_SIZE: 0,
        };

        process.env = {
            NODE_ENV: `${expected.NODE_ENV}`,
            PORT: `${expected.PORT}`,
            IDENTIGRAF_UPLOAD_FOLDER: `${expected.IDENTIGRAF_UPLOAD_FOLDER}`,
            IDENTIGRAF_MAX_FILE_SIZE: `${expected.IDENTIGRAF_MAX_FILE_SIZE}`,
        };

        let actual = { ...environment(true) };
        expect(actual).toStrictEqual(expected);

        process.env = {
            NODE_ENV: `${expected.NODE_ENV}${expected.NODE_ENV}`,
            PORT: `1${expected.PORT}`,
            IDENTIGRAF_UPLOAD_FOLDER: `${expected.IDENTIGRAF_UPLOAD_FOLDER}/`,
            IDENTIGRAF_MAX_FILE_SIZE: `1${expected.IDENTIGRAF_MAX_FILE_SIZE}`,
        };

        actual = { ...environment() };
        expect(actual).toStrictEqual(expected);
    });
});
