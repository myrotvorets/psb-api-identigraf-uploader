/* istanbul ignore file */

import './lib/tracing';
import { run } from './server';

run().catch((e) => console.error(e));
