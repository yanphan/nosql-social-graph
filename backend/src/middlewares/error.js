export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  if (status === 500) {
    console.error('Unhandled Server Error:', err);
  }
  res.status(status).json({
    ok: false,
    error: {
      code: err.code ?? 'INTERNAL',
      // Lỗi 500 ẩn chi tiết, trừ lỗi đã soạn sẵn cho người dùng (expose), ví dụ phục hồi thất bại
      message: status === 500 && !err.expose ? 'Lỗi hệ thống' : err.message,
    },
  });
}
