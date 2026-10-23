import * as usersRepo from '../repositories/users.repo.js';
import * as analyticsRepo from '../repositories/analytics.repo.js';
import { NotFound } from '../utils/errors.js';
import { computeBFSPath } from '../utils/graphAlgos.js';

export async function findPath({ from, to, maxDepth = 6 }) {
  const [a, b] = await Promise.all([
    usersRepo.findByUsername(from),
    usersRepo.findByUsername(to),
  ]);

  if (!a || !b) {
    throw new NotFound('Tài khoản không tồn tại');
  }

  if (from === to) {
    return {
      found: true,
      length: 0,
      steps: [from],
      graph: {
        nodes: [{ id: a.id, label: 'User', props: { username: a.username, fullName: a.fullName } }],
        edges: [],
      },
    };
  }

  try {
    const path = await analyticsRepo.shortestPath(from, to, maxDepth);
    if (!path) {
      return { found: false, length: null, steps: [], graph: { nodes: [], edges: [] } };
    }
    return { found: true, ...path };
  } catch (err) {
    // Fallback sang BFS in-memory nếu Cypher shortestPath không hỗ trợ trên phiên bản FalkorDB này
    console.warn('FalkorDB shortestPath error, using BFS fallback:', err.message);
    const edges = await analyticsRepo.allFollowEdges();
    const bfsRes = computeBFSPath(edges, a.id, b.id, maxDepth);
    if (!bfsRes.found) {
      return { found: false, length: null, steps: [], graph: { nodes: [], edges: [] } };
    }

    // Map user ID -> username
    const allUsers = await Promise.all(bfsRes.steps.map((id) => usersRepo.findById(id)));
    const steps = allUsers.map((u) => u?.username ?? '');
    const nodes = allUsers.map((u) => ({
      id: u.id,
      label: 'User',
      props: { username: u.username, fullName: u.fullName ?? '' },
    }));
    const pathEdges = [];
    for (let i = 0; i < bfsRes.steps.length - 1; i++) {
      const s = bfsRes.steps[i];
      const t = bfsRes.steps[i + 1];
      pathEdges.push({
        id: `FOLLOWS:${s}:${t}`,
        type: 'FOLLOWS',
        source: s,
        target: t,
        props: {},
      });
    }

    return {
      found: true,
      length: bfsRes.length,
      steps,
      graph: { nodes, edges: pathEdges },
    };
  }
}
