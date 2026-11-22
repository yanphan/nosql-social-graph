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

// Tài khoản bị khóa: tách khỏi FORBIDDEN để frontend biết phải đăng xuất
export const Locked = class extends AppError {
  constructor(m = 'Tài khoản của bạn đã bị khóa') {
    super(403, 'ACCOUNT_LOCKED', m);
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
