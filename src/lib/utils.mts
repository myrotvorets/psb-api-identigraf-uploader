import { sep } from 'node:path';

export function hashGuid(guid: string, separator = sep): string {
    if (!/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/u.test(guid)) {
        throw new TypeError(`GUID is not valid: ${guid}`);
    }

    return [guid.substring(0, 2), guid.substring(2, 4), guid.substring(4, 6)].join(separator);
}
