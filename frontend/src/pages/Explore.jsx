import { useState, useEffect } from 'react';
import { Network, ZoomIn, Eye, RefreshCw, X, UserPlus } from 'lucide-react';
import { http } from '../api/client';
import GraphCanvas from '../components/graph/GraphCanvas';

export default function Explore() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGraph = async (center = '') => {
    setLoading(true);
    try {
      const data = await http.get('/graph/subgraph', {
        params: { center, limit: 100 },
      });
      setGraph(data);
    } catch (err) {
      console.error('Fetch graph error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleExpandNeighbor = async (nodeId) => {
    try {
      const more = await http.get('/graph/subgraph', {
        params: { center: nodeId, limit: 50 },
      });
      // Merge into current graph
      setGraph((prev) => ({
        nodes: [...prev.nodes, ...more.nodes.filter((n) => !prev.nodes.some((pn) => pn.id === n.id))],
        edges: [...prev.edges, ...more.edges.filter((e) => !prev.edges.some((pe) => pe.id === e.id))],
      }));
    } catch (err) {
      console.error('Expand neighbor error:', err);
    }
  };

  return (
    <div className="h-full flex gap-4 relative">
      {/* Main Canvas */}
      <div className="flex-1 glass-panel rounded-2xl border border-surfaceBorder relative overflow-hidden flex flex-col">
        {/* Controls Overlay */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 glass-panel px-3 py-1.5 rounded-xl border border-surfaceBorder text-xs text-ink">
          <Network className="w-4 h-4 text-user" />
          <span className="font-semibold">Đồ thị mạng lưới ({graph.nodes.length} nodes, {graph.edges.length} edges)</span>
          <button
            onClick={() => fetchGraph()}
            className="p-1 hover:text-user transition-all ml-2"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 w-full h-full p-2">
          <GraphCanvas
            graph={graph}
            onNodeTap={(nodeData) => setSelectedNode(nodeData)}
          />
        </div>
      </div>

      {/* Side Details Panel */}
      {selectedNode && (
        <div className="w-80 glass-panel rounded-2xl p-5 border border-surfaceBorder shrink-0 flex flex-col justify-between animate-in fade-in slide-in-from-right duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
              <span className="text-xs font-semibold uppercase text-user tracking-wider">
                {selectedNode.type} Node
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg hover:bg-surface text-muted hover:text-ink transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[11px] text-muted">Định danh (ID)</p>
                <p className="text-xs font-mono text-ink break-all">{selectedNode.id}</p>
              </div>

              <div>
                <p className="text-[11px] text-muted">Nhãn hiển thị</p>
                <p className="text-sm font-semibold text-ink">{selectedNode.label}</p>
              </div>

              <div>
                <p className="text-[11px] text-muted mb-1">Thuộc tính (Properties)</p>
                <div className="p-2.5 rounded-xl bg-surface border border-surfaceBorder max-h-48 overflow-y-auto space-y-1">
                  {Object.entries(selectedNode.props || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px]">
                      <span className="text-muted font-mono">{k}:</span>
                      <span className="text-ink font-mono font-medium truncate max-w-[140px]">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-surfaceBorder space-y-2">
            <button
              onClick={() => handleExpandNeighbor(selectedNode.id)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-user/20 border border-user/40 text-user text-xs font-medium hover:bg-user/30 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Mở rộng láng giềng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
