export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  if (status === 500) {
    console.error('Unhandled Server Error:', err);
  }
  res.status(status).json({
    ok: false,
    error: {
      code: err.code ?? 'INTERNAL',
      message: status === 500 ? 'Lỗi hệ thống' : err.message,
    },
  });
}
