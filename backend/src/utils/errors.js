export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const NotFound = class extends AppError {
  constructor(m = 'Không tìm thấy') {
    super(404, 'NOT_FOUND', m);
  }
};

export const Forbidden = class extends AppError {
  constructor(m = 'Không có quyền') {
    super(403, 'FORBIDDEN', m);
  }
};

export const Unauth = class extends AppError {
  constructor(m = 'Chưa đăng nhập') {
    super(401, 'UNAUTHENTICATED', m);
  }
};

export const Conflict = class extends AppError {
  constructor(m = 'Dữ liệu đã tồn tại') {
    super(409, 'CONFLICT', m);
  }
};

export const Invalid = class extends AppError {
  constructor(m = 'Dữ liệu không hợp lệ') {
    super(400, 'VALIDATION_ERROR', m);
  }
};
