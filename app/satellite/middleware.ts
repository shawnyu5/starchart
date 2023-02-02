import type express from 'express';
import logger from './logger';

// Default error handler
// eslint-disable-next-line no-unused-vars
function errorHandler(
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const status = err.status || 500;

  // Only log 500s
  if (status > 499) {
    logger.error({ err, req, res });
  }

  res.status(status);

  if (req.accepts('html')) {
    res.set('Content-Type', 'text/html');
    res.send(`<h1>${err.status} Error</h1><p>${err.message}</p>`);
  } else if (req.accepts('json')) {
    res.json({
      status: err.status,
      message: err.message,
    });
  } else {
    res.send(`${err.status} Error: ${err.message}\n`);
  }
}
export default errorHandler;
