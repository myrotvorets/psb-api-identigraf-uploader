/* c8 ignore start */
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { OpenTelemetryConfigurator } from '@myrotvorets/opentelemetry-configurator';

if (!+(process.env.ENABLE_TRACING || 0)) {
    process.env.OTEL_SDK_DISABLED = 'true';
}

const configurator = new OpenTelemetryConfigurator({
    serviceName: 'psb-api-identigraf-uploader',
    instrumentations: [new ExpressInstrumentation(), new HttpInstrumentation()],
});

configurator.start();
/* c8 ignore end */
