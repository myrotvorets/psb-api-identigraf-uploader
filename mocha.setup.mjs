import { use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { reset } from 'testdouble';

use(chaiAsPromised);
use(chaiSubset);

const env = { ...process.env };

process.env = {
    NODE_ENV: 'test',
    OTEL_SDK_DISABLED: 'true',
    IDENTIGRAF_UPLOAD_FOLDER: '/somewhere',
    IDENTIGRAF_MAX_FILE_SIZE: '100',
};

/** @type {import('mocha').RootHookObject} */
export const mochaHooks = {
    afterAll() {
        process.env = { ...env };
    },
    /** @returns {void} */
    afterEach() {
        reset();
    },
};
