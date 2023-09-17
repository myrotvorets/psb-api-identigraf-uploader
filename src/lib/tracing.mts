/* istanbul ignore file */

import { EventEmitter } from 'node:events';
import { OpenTelemetryConfigurator } from '@myrotvorets/opentelemetry-configurator';

if (+(process.env.ENABLE_TRACING || 0)) {
    const configurator = new OpenTelemetryConfigurator({
        serviceName: 'psb-api-identigraf-uploader',
    });

    configurator.start();
    EventEmitter.defaultMaxListeners += 5;
}
