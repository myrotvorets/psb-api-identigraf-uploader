/* c8 ignore start */
import { OpenTelemetryConfigurator, getExpressInstrumentations } from '@myrotvorets/opentelemetry-configurator';
import { initProcessMetrics } from '@myrotvorets/otel-utils';

process.env['OTEL_SERVICE_NAME'] = 'psb-api-identigraf-uploader';

export const configurator = new OpenTelemetryConfigurator({
    serviceName: process.env['OTEL_SERVICE_NAME'],
    instrumentations: [...getExpressInstrumentations()],
});

configurator.start();

await initProcessMetrics();

try {
    const { run } = await import('./server.mjs');
    await run();
} catch (e) {
    console.error(e);
}
/* c8 ignore stop */
