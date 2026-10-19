import { Invalid } from '../utils/errors.js';

export const validate = (schema, where = 'body') => (req, _res, next) => {
  const r = schema.safeParse(req[where]);
  if (!r.success) {
    const errorDetails = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return next(new Invalid(errorDetails));
  }
  req[where] = r.data;
  next();
};
