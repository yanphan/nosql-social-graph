import { read } from '../db/graph.js';
import { users } from '../queries/users.js';

// Vai trò và trạng thái hiện tại của tài khoản; null nếu tài khoản không còn tồn tại
export async function findAuthState(id) {
  const rows = await read(users.authState, { id });
  if (!rows[0]) return null;
  return { role: rows[0].role, status: rows[0].status ?? 'active' };
}
