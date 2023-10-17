import type { RequestHandler } from 'express';
import { hrTime, hrTimeDuration, hrTimeToMilliseconds } from '@opentelemetry/core';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import type { OpenApiRequest } from '@myrotvorets/oav-installer';
import { requestDurationHistogram } from '../lib/otel.mjs';

export const requestDurationMiddleware: RequestHandler = (req, res, next): void => {
    const start = hrTime();
    const recordDurarion = (): void => {
        res.removeListener('error', recordDurarion);
        res.removeListener('finish', recordDurarion);
        const end = hrTime();
        const duration = hrTimeDuration(start, end);

        let route: string | undefined;
        if ('openapi' in req && req.openapi) {
            const r = req as OpenApiRequest;
            route = r.openapi!.openApiRoute || r.openapi!.expressRoute;
        }

        if (!route && req.route) {
            route = (req.route as Record<'path', string>).path;
        }

        if (!route) {
            route = '<unknown>';
        }

        requestDurationHistogram.record(hrTimeToMilliseconds(duration), {
            [SemanticAttributes.HTTP_METHOD]: req.method,
            [SemanticAttributes.HTTP_ROUTE]: route,
            [SemanticAttributes.HTTP_STATUS_CODE]: res.statusCode,
        });
    };

    res.prependOnceListener('error', recordDurarion);
    res.prependOnceListener('finish', recordDurarion);
    next();
};
