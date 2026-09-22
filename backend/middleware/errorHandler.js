/** Unknown path → JSON 404, so the frontend never has to parse an HTML error. */
export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * Central error handler. Express 5 forwards rejected async handlers here
 * automatically, so route code can throw without try/catch.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies this by its four parameters.
export function errorHandler(error, req, res, next) {
  const status = error.status ?? 500;
  if (status >= 500) console.error('[api]', error);
  res.status(status).json({
    message: status >= 500 ? 'Something went wrong on the server.' : error.message,
  });
}
