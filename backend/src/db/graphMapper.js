const hidden = new Set(['passwordHash']);
const clean = (props = {}) => Object.fromEntries(Object.entries(props).filter(([k]) => !hidden.has(k)));

export const nodeDto = (n) => ({
  id: n.properties.id,
  label: n.labels ? n.labels[0] : (n.label ?? 'Node'),
  props: clean(n.properties),
});

// rows có dạng [{a, r, b}] (a,b = node; r = edge)
export function rowsToGraph(rows) {
  const nodes = new Map();
  const edges = new Map();
  const internal = new Map();

  const add = (n) => {
    if (!n || !n.properties) return;
    internal.set(n.id, n.properties.id);
    if (!nodes.has(n.properties.id)) {
      nodes.set(n.properties.id, nodeDto(n));
    }
  };

  for (const { a, b } of rows) {
    if (a) add(a);
    if (b) add(b);
  }

  for (const { r } of rows) {
    if (!r) continue;
    const s = internal.get(r.sourceId) ?? r.src;
    const t = internal.get(r.destinationId) ?? r.dest;
    const relType = r.relationshipType ?? r.relation ?? r.type;
    const id = `${relType}:${s}:${t}`;
    if (!edges.has(id)) {
      edges.set(id, {
        id,
        type: relType,
        source: s,
        target: t,
        props: clean(r.properties),
      });
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

// Cho BT1: ns/rs là mảng node/edge của path
export function pathToGraph({ ns = [], rs = [] }) {
  const rows = rs.map((r, i) => ({ a: ns[i], r, b: ns[i + 1] }));
  return rowsToGraph(rows.length ? rows : [{ a: ns[0], r: null, b: ns[0] }]);
}
