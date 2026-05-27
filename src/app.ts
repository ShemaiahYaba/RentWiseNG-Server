import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { getAllowedOrigins } from './config/env.js';
import { initSentry, Sentry } from './config/sentry.js';
import { isSwaggerEnabled, swaggerSpec } from './config/swagger.js';
import { requestContextMiddleware } from './context/requestContext.js';
import type { Express } from 'express';
import { ok } from './lib/response.js';
import { defaultRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { auditLogRouter } from './modules/auditLog/auditLog.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { conversationRouter } from './modules/conversations/conversation.routes.js';
import { inspectionRouter } from './modules/inspections/inspection.routes.js';
import { kycRouter } from './modules/kyc/kyc.routes.js';
import { listingRouter } from './modules/listings/listing.routes.js';
import { mediaRouter } from './modules/media/media.routes.js';
import { paymentRouter } from './modules/payments/payment.routes.js';
import { reportRouter } from './modules/reports/report.routes.js';
import { reviewRouter } from './modules/reviews/review.routes.js';
import { userRouter } from './modules/user/user.routes.js';

initSentry();

export const app: Express = express();

app.use(helmet());
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestContextMiddleware);
app.use(defaultRateLimiter);

app.get('/health', (_req, res) => {
  ok(res, { status: 'ok' });
});

const api = express.Router();
api.use('/auth', authRouter);
api.use('/users', userRouter);
api.use('/kyc', kycRouter);
api.use('/listings', listingRouter);
api.use('/media', mediaRouter);
api.use('/inspections', inspectionRouter);
api.use('/payments', paymentRouter);
api.use('/conversations', conversationRouter);
api.use('/reviews', reviewRouter);
api.use('/reports', reportRouter);
api.use('/audit-logs', auditLogRouter);
api.use('/admin', adminRouter);

if (isSwaggerEnabled()) {
  api.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use('/api/v1', api);

Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);
