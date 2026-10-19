import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { cyStyle, NODE, EDGE } from '../../lib/graphTheme';

cytoscape.use(fcose);

const sizeOf = (n) =>
  n.label === 'User' ? 26 + Math.min(30, (n.props.followers ?? 0) * 0.3) : n.label === 'Post' ? 22 : 30;

const toEls = ({ nodes = [], edges = [] }) => [
  ...nodes.map((n) => ({
    data: {
      id: n.id,
      type: n.label,
      props: n.props,
      color: NODE[n.label] || '#94A3B8',
      size: sizeOf(n),
      label: n.props.username ?? n.props.name ?? (n.props.content ?? '').slice(0, 18),
    },
  })),
  ...edges.map((e) => ({
    data: {
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      color: EDGE[e.type] || '#64748B',
    },
  })),
];

/**
 * Props:
 * - graph: GraphDto ({ nodes, edges })
 * - highlight: string[] id theo thứ tự đường đi
 * - onNodeTap: (nodeData) => void
 * - hiddenTypes: Set of hidden types
 */
export default function GraphCanvas({ graph, highlight = [], onNodeTap, hiddenTypes = new Set() }) {
  const box = useRef(null);
  const cy = useRef(null);

  useEffect(() => {
    if (!box.current) return;
    cy.current = cytoscape({
      container: box.current,
      style: cyStyle,
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3,
    });

    cy.current.on('tap', 'node', (e) => onNodeTap?.(e.target.data()));

    cy.current.on('mouseover', 'node', (e) => {
      const n = e.target;
      cy.current.elements().addClass('dim');
      n.closedNeighborhood().removeClass('dim');
      n.addClass('hl');
    });

    cy.current.on('mouseout', 'node', () => {
      cy.current.elements().removeClass('dim hl');
    });

    return () => cy.current?.destroy();
  }, []);

  useEffect(() => {
    // merge dữ liệu mới, không xóa phần đang hiển thị
    const c = cy.current;
    if (!c || !graph) return;
    const have = new Set(c.elements().map((x) => x.id()));
    const add = toEls(graph).filter((e) => !have.has(e.data.id));
    if (!add.length) return;
    c.add(add);
    c.layout({
      name: 'fcose',
      animate: true,
      animationDuration: 600,
      randomize: false,
      fit: true,
      padding: 40,
    }).run();
  }, [graph]);

  useEffect(() => {
    // ẩn/hiện theo loại node
    cy.current?.nodes().forEach((n) => {
      n.style('display', hiddenTypes.has(n.data('type')) ? 'none' : 'element');
    });
  }, [hiddenTypes]);

  useEffect(() => {
    // sáng dần theo thứ tự đường đi (BT1)
    const c = cy.current;
    if (!c || !highlight.length) return;
    c.elements().addClass('dim');
    highlight.forEach((id, i) => {
      setTimeout(() => {
        const n = c.getElementById(id);
        n.removeClass('dim').addClass('hl');
        if (i > 0) {
          c.getElementById(highlight[i - 1]).edgesTo(n).removeClass('dim').addClass('flow');
        }
      }, i * 350);
    });
  }, [highlight]);

  return (
    <div
      ref={box}
      className="h-full w-full rounded-2xl bg-[radial-gradient(rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:22px_22px] relative"
    />
  );
}
