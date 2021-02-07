import { cleanEnv, num, port, str } from 'envalid';

export interface Environment {
    NODE_ENV: string;
    PORT: number;

    IDENTIGRAF_UPLOAD_FOLDER: string;
    IDENTIGRAF_MAX_FILE_SIZE: number;
}

let environ: Environment | null = null;

export function environment(reset = false): Environment {
    if (!environ || reset) {
        environ = cleanEnv(process.env, {
            NODE_ENV: str({ default: 'development' }),
            PORT: port({ default: 3000 }),
            IDENTIGRAF_UPLOAD_FOLDER: str(),
            IDENTIGRAF_MAX_FILE_SIZE: num({ default: 5242880 }),
        });
    }

    return environ;
}
