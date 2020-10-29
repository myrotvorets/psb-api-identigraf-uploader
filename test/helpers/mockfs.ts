import fs from 'fs';

const mockPromises = jest.spyOn(fs, 'promises', 'get');
fs.promises;
mockPromises.mockImplementationOnce(() => {
    const result = mockPromises.getMockImplementation()() as typeof import('fs/promises');
    const exports = result as Record<string, unknown>;
    for (const item in result) {
        if (typeof exports[item] === 'function') {
            jest.spyOn(result, item as never);
        }
    }

    return result;
});
