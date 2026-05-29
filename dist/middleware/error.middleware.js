import { AppError } from '../types/index.js';
import { logger } from '../utils/logger.js';
export const errorHandler = (err, req, res, _next) => {
    if (err instanceof AppError) {
        logger.warn({ code: err.code, path: req.path, status: err.statusCode }, err.message);
        res.status(err.statusCode).json({
            success: false,
            code: err.code,
            message: err.message,
        });
        return;
    }
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    logger.error({ path: req.path, error: message }, 'Unhandled error');
    res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
    });
};
