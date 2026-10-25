/**
 * Thuật toán đồ thị in-memory dự phòng (Fallback algorithms)
 * Sử dụng khi CSDL FalkorDB không có hoặc chưa nạp module algo.*
 */

/**
 * Tính PageRank in-memory bằng phương pháp Power Iteration
 * @param {Array<{s: string, t: string}>} edges - Danh sách các cạnh có hướng s -> t
 * @param {Object} options - Cấu hình { d: 0.85, maxIter: 20, tol: 1e-5 }
 * @returns {Array<{id: string, score: number}>} - Danh sách node kèm điểm PageRank giảm dần
 */
export function computePageRank(edges, { d = 0.85, maxIter = 20, tol = 1e-6 } = {}) {
  const nodesSet = new Set();
  const outDegree = new Map();
  const inNeighbors = new Map();

  for (const { s, t } of edges) {
    if (!s || !t) continue;
    nodesSet.add(s);
    nodesSet.add(t);

    outDegree.set(s, (outDegree.get(s) || 0) + 1);

    if (!inNeighbors.has(t)) inNeighbors.set(t, []);
    inNeighbors.get(t).push(s);
  }

  const nodes = [...nodesSet];
  const N = nodes.length;
  if (N === 0) return [];

  // Khởi tạo điểm ban đầu đều nhau 1/N
  let p = new Map();
  for (const node of nodes) {
    p.set(node, 1 / N);
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const nextP = new Map();
    let danglingSum = 0;

    for (const node of nodes) {
      if (!outDegree.has(node) || outDegree.get(node) === 0) {
        danglingSum += p.get(node);
      }
    }

    let diff = 0;
    for (const node of nodes) {
      const incoming = inNeighbors.get(node) || [];
      let sumIn = 0;
      for (const src of incoming) {
        sumIn += p.get(src) / outDegree.get(src);
      }

      const score = (1 - d) / N + d * (sumIn + danglingSum / N);
      nextP.set(node, score);
      diff += Math.abs(score - p.get(node));
    }

    p = nextP;
    if (diff < tol) break;
  }

  return nodes
    .map((id) => ({ id, score: Number(p.get(id).toFixed(6)) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Phân cụm cộng đồng liên thông yếu (Weakly Connected Components - WCC)
 * @param {Array<{s: string, t: string}>} edges - Danh sách các cạnh (xét vô hướng)
 * @param {Array<string>} [allNodes=[]] - Toàn bộ danh sách node (bao gồm node cô lập)
 * @returns {Array<{cid: string, members: string[]}>} - Danh sách component giảm dần theo kích thước
 */
export function computeWCC(edges, allNodes = []) {
  const parent = new Map();

  function find(i) {
    if (!parent.has(i)) parent.set(i, i);
    if (parent.get(i) === i) return i;
    const root = find(parent.get(i));
    parent.set(i, root);
    return root;
  }

  function union(i, j) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent.set(rootI, rootJ);
    }
  }

  for (const node of allNodes) {
    find(node);
  }

  for (const { s, t } of edges) {
    if (s && t) union(s, t);
  }

  const groups = new Map();
  for (const [node] of parent) {
    const root = find(node);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(node);
  }

  return [...groups.entries()]
    .map(([cid, members]) => ({ cid, members: members.sort() }))
    .sort((a, b) => b.members.length - a.members.length);
}

/**
 * Tìm đường đi ngắn nhất BFS in-memory (dự phòng)
 * @param {Array<{s: string, t: string}>} edges - Danh sách các cạnh
 * @param {string} startNode
 * @param {string} targetNode
 * @param {number} [maxDepth=6]
 * @returns {{found: boolean, steps: string[], length: number|null}}
 */
export function computeBFSPath(edges, startNode, targetNode, maxDepth = 6) {
  if (startNode === targetNode) {
    return { found: true, steps: [startNode], length: 0 };
  }

  const adj = new Map();
  for (const { s, t } of edges) {
    if (!adj.has(s)) adj.set(s, []);
    adj.get(s).push(t);
  }

  const queue = [[startNode, [startNode]]];
  const visited = new Set([startNode]);

  while (queue.length > 0) {
    const [curr, path] = queue.shift();
    if (path.length - 1 >= maxDepth) continue;

    const neighbors = adj.get(curr) || [];
    for (const nxt of neighbors) {
      if (nxt === targetNode) {
        const fullPath = [...path, nxt];
        return { found: true, steps: fullPath, length: fullPath.length - 1 };
      }
      if (!visited.has(nxt)) {
        visited.add(nxt);
        queue.push([nxt, [...path, nxt]]);
      }
    }
  }

  return { found: false, steps: [], length: null };
}
