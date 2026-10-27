import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import {
  Network,
  LayoutDashboard,
  Compass,
  Award,
  Users,
  Route as RouteIcon,
  Filter,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  Layers,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  ArrowRight,
  ArrowLeftRight,
  Copy,
  Check,
  ExternalLink,
  Info,
  Calendar,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  FileText,
  Hash,
  UserCheck,
  Eye,
  EyeOff,
  Bell,
  LogOut,
  Menu,
  Shield,
  HelpCircle,
  BarChart3,
  TrendingUp,
  CircleDot
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend as RechartsLegend,
  Cell
} from 'recharts';

import { analyticsApi } from '@/services/analytics';
import { authService } from '@/services/auth';
import '@/styles/tokens.css';

// Register Cytoscape layout plugin
try {
  cytoscape.use(fcose);
} catch (e) {
  // Already registered
}

// Bảng màu 8 cộng đồng chuẩn Colorblind-Safe
const COMMUNITY_COLORS = [
  '#2563EB', // 1. Xanh dương
  '#F97316', // 2. Cam
  '#10B981', // 3. Xanh lá
  '#8B5CF6', // 4. Tím
  '#EF4444', // 5. Đỏ
  '#EAB308', // 6. Vàng
  '#EC4899', // 7. Hồng
  '#64748B', // 8. Xám slate
];

// Màu node theo loại
const NODE_TYPE_COLORS = {
  User: '#2563EB',
  Post: '#F97316',
  Topic: '#8B5CF6',
};

// Màu quan hệ
const EDGE_COLORS = {
  FOLLOWS: '#64748B',
  LIKED: '#EC4899',
  ABOUT: '#A855F7',
  POSTED: '#94A3B8',
};

export default function AnalystPage() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => authService.getStoredUser());

  // Navigation: 'overview' | 'explore' | 'pagerank' | 'communities' | 'shortest_path'
  const [activeMenu, setActiveMenu] = useState('explore');

  // Chế độ hiển thị Cột giữa: 'graph' (Đồ thị) | 'analytics' (Thống kê)
  const [viewMode, setViewMode] = useState('graph');

  // Layout Responsive States
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightVisible, setIsRightVisible] = useState(true);
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);

  // Graph Canvas Dark Mode Toggle
  const [isDarkCanvas, setIsDarkCanvas] = useState(false);

  // Layout Engine
  const [graphLayout, setGraphLayout] = useState('fcose'); // 'fcose' | 'circle' | 'concentric' | 'grid'

  // Loading, Errors & Notifications
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Data States
  const [stats, setStats] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [kolsList, setKolsList] = useState([]);
  const [communitiesList, setCommunitiesList] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [activeCommunityHighlight, setActiveCommunityHighlight] = useState(null);

  // Selected Node Inspector
  const [selectedNode, setSelectedNode] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Filters State
  const [nodeTypeFilters, setNodeTypeFilters] = useState({
    User: true,
    Post: true,
    Topic: true,
  });
  const [relTypeFilters, setRelTypeFilters] = useState({
    FOLLOWS: true,
    LIKED: true,
    ABOUT: true,
  });
  const [timePreset, setTimePreset] = useState('30d'); // '7d' | '30d' | '90d' | 'custom'
  const [dateRange, setDateRange] = useState({
    from: '2026-09-27',
    to: '2026-10-27',
  });
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSuggestions, setQuickSuggestions] = useState([]);

  // Shortest Path Tool State (UC-09)
  const [pathSource, setPathSource] = useState('alice');
  const [pathTarget, setPathTarget] = useState('david');
  const [pathMaxDepth, setPathMaxDepth] = useState(6);
  const [pathResult, setPathResult] = useState(null);
  const [isPathSearching, setIsPathSearching] = useState(false);

  // Chart Interactive Filters
  const [chartMetric, setChartMetric] = useState('all'); // 'all' | 'likes' | 'comments'

  // Refs
  const cyContainerRef = useRef(null);
  const cyRef = useRef(null);

  // Toast Notification Trigger
  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Phím tắt toàn cục (1-5 chuyển chức năng, Esc bỏ chọn)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Khi không gõ vào input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === '1') setActiveMenu('overview');
      if (e.key === '2') setActiveMenu('explore');
      if (e.key === '3') setActiveMenu('pagerank');
      if (e.key === '4') setActiveMenu('communities');
      if (e.key === '5') setActiveMenu('shortest_path');
      if (e.key === 'Escape') {
        setSelectedNode(null);
        if (cyRef.current) {
          cyRef.current.elements().removeClass('dimmed highlighted path-highlighted');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Tải toàn bộ dữ liệu ban đầu
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      await analyticsApi.ensureAnalystAuth();
      const [sData, gData, kData, cData, tData] = await Promise.all([
        analyticsApi.getStats(),
        analyticsApi.getSubgraph({ limit: 120 }),
        analyticsApi.getInfluence({ metric: 'pagerank', limit: 10 }),
        analyticsApi.getCommunities(),
        analyticsApi.getTrendingTopics({ days: 30, limit: 8 }),
      ]);

      setStats(sData);
      setGraphData(gData);
      setKolsList(kData);
      setCommunitiesList(cData.communities || []);
      setTrendingTopics(tData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Không thể kết nối đến backend. Đang sử dụng chế độ ngoại tuyến giả lập.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Khởi tạo và cập nhật Cytoscape Canvas
  useEffect(() => {
    if (!cyContainerRef.current) return;

    // Filter nodes and edges based on state
    const filteredNodes = graphData.nodes.filter(
      (n) => nodeTypeFilters[n.data.type] !== false
    );
    const validNodeIds = new Set(filteredNodes.map((n) => n.data.id));
    const filteredEdges = graphData.edges.filter(
      (e) =>
        validNodeIds.has(e.data.source) &&
        validNodeIds.has(e.data.target) &&
        relTypeFilters[e.data.type] !== false
    );

    // Xây dựng Cytoscape instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: cyContainerRef.current,
      elements: [...filteredNodes, ...filteredEdges],
      style: [
        // Node cơ bản
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-size': '11px',
            'font-weight': 500,
            color: isDarkCanvas ? '#E2E8F0' : '#1E293B',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-background-opacity': isDarkCanvas ? 0.7 : 0.8,
            'text-background-color': isDarkCanvas ? '#0B1220' : '#FFFFFF',
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            width: (ele) => {
              const pr = ele.data('pagerank') || 0.05;
              // Quy mô bán kính từ 16px đến 56px theo căn bậc 2 của PageRank
              return Math.max(16, Math.min(56, Math.round(Math.sqrt(pr) * 75)));
            },
            height: (ele) => {
              const pr = ele.data('pagerank') || 0.05;
              return Math.max(16, Math.min(56, Math.round(Math.sqrt(pr) * 75)));
            },
            'background-color': (ele) => {
              // Nếu đang xem Bản đồ cộng đồng (UC-14)
              if (activeMenu === 'communities') {
                return ele.data('communityColor') || '#2563EB';
              }
              // Mặc định: theo loại Node
              return NODE_TYPE_COLORS[ele.data('type')] || '#2563EB';
            },
            'border-width': 2,
            'border-color': isDarkCanvas ? '#1E293B' : '#FFFFFF',
            'transition-property': 'background-color, border-color, width, height, opacity',
            'transition-duration': '0.2s',
          },
        },
        // Top KOLs (UC-13) - Viền sáng hào quang nổi bật
        {
          selector: 'node[?isKOL]',
          style: {
            'border-width': 3,
            'border-color': '#F59E0B',
            'font-weight': 600,
            'font-size': '12px',
          },
        },
        // Edges
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': (ele) => EDGE_COLORS[ele.data('type')] || '#94A3B8',
            'target-arrow-color': (ele) => EDGE_COLORS[ele.data('type')] || '#94A3B8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            opacity: isDarkCanvas ? 0.45 : 0.6,
            'line-style': (ele) => (ele.data('type') === 'ABOUT' ? 'dashed' : 'solid'),
          },
        },
        // Hover state
        {
          selector: 'node:active, node:hover',
          style: {
            'border-width': 3,
            'border-color': '#3B82F6',
            'shadow-blur': 12,
            'shadow-color': '#2563EB',
            'shadow-opacity': 0.5,
          },
        },
        // Selected Node
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#2563EB',
            'shadow-blur': 16,
            'shadow-color': '#2563EB',
            'shadow-opacity': 0.7,
          },
        },
        // Dimmed nodes/edges
        {
          selector: '.dimmed',
          style: {
            opacity: 0.12,
          },
        },
        // Highlighted community nodes
        {
          selector: '.highlighted',
          style: {
            opacity: 1,
            'border-width': 3,
            'border-color': '#FFFFFF',
            'shadow-blur': 14,
            'shadow-opacity': 0.8,
          },
        },
        // Shortest Path Highlighting (UC-09)
        {
          selector: '.path-highlighted',
          style: {
            opacity: 1,
            'border-color': '#EAB308',
            'border-width': 4,
            'line-color': '#EAB308',
            'target-arrow-color': '#EAB308',
            width: 3.5,
            'shadow-blur': 18,
            'shadow-color': '#EAB308',
            'shadow-opacity': 0.9,
          },
        },
      ],
      layout: {
        name: graphLayout === 'fcose' ? 'fcose' : graphLayout,
        animate: true,
        animationDuration: 600,
        randomize: false,
        fit: true,
        padding: 40,
        nodeRepulsion: 6500,
        idealEdgeLength: 60,
      },
    });

    // Node click handler -> Inspect details
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode(node.data());
      // Làm sáng node được chọn và các láng giềng kề cận
      const neighborhood = node.neighborhood().add(node);
      cy.elements().addClass('dimmed');
      neighborhood.removeClass('dimmed');
    });

    // Background click -> Deselect
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.elements().removeClass('dimmed highlighted path-highlighted');
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [graphData, nodeTypeFilters, relTypeFilters, isDarkCanvas, graphLayout, activeMenu]);

  // Highlight cộng đồng cụ thể khi click từ Legend hoặc danh sách WCC
  const handleHighlightCommunity = (cid) => {
    if (!cyRef.current) return;
    if (activeCommunityHighlight === cid) {
      setActiveCommunityHighlight(null);
      cyRef.current.elements().removeClass('dimmed highlighted');
      return;
    }

    setActiveCommunityHighlight(cid);
    cyRef.current.elements().addClass('dimmed');

    const communityNodes = cyRef.current.nodes().filter((n) => String(n.data('community')) === String(cid));
    const communityEdges = communityNodes.connectedEdges();

    communityNodes.removeClass('dimmed').addClass('highlighted');
    communityEdges.removeClass('dimmed');
  };

  // Focus vào một node cụ thể trên canvas
  const handleFocusNode = (usernameOrId) => {
    if (!cyRef.current) return;
    const clean = usernameOrId.replace(/^[@#]/, '');
    const target = cyRef.current.nodes().filter((n) => {
      const d = n.data();
      return d.username === clean || d.id === clean || d.name === clean || d.id === `u_${clean}`;
    });

    if (target.length > 0) {
      cyRef.current.animate({
        center: { eles: target },
        zoom: 1.8,
        duration: 400,
      });
      target.select();
      setSelectedNode(target.data());
      showToast(`Đã định vị thực thể: ${target.data('label')}`);
    } else {
      showToast('Không tìm thấy thực thể trong đồ thị hiện tại');
    }
  };

  // Mở rộng láng giềng (Neighborhood Expansion)
  const handleExpandNeighborhood = async (nodeId) => {
    showToast('Đang mở rộng các đỉnh liên kết láng giềng...');
    try {
      const more = await analyticsApi.getSubgraph({ center: nodeId, limit: 50 });
      if (more && more.nodes?.length > 0) {
        setGraphData((prev) => {
          const existingIds = new Set(prev.nodes.map((n) => n.data.id));
          const newNodes = more.nodes.filter((n) => !existingIds.has(n.data.id));
          const existingEdgeIds = new Set(prev.edges.map((e) => e.data.id));
          const newEdges = more.edges.filter((e) => !existingEdgeIds.has(e.data.id));
          return {
            nodes: [...prev.nodes, ...newNodes],
            edges: [...prev.edges, ...newEdges],
          };
        });
        showToast('Đã nạp thêm các quan hệ láng giềng thành công');
      }
    } catch {
      showToast('Không thể mở rộng láng giềng');
    }
  };

  // Phân tích đường đi ngắn nhất (UC-09)
  const handleAnalyzePath = async () => {
    if (!pathSource.trim() || !pathTarget.trim()) {
      showToast('Vui lòng nhập đầy đủ người dùng A và B');
      return;
    }
    setIsPathSearching(true);
    try {
      const res = await analyticsApi.findShortestPath({
        from: pathSource.trim(),
        to: pathTarget.trim(),
        maxDepth: pathMaxDepth,
      });
      setPathResult(res);

      // Highlight đường đi trên Cytoscape canvas nếu có kết quả
      if (cyRef.current && res && res.steps && res.steps.length > 0) {
        cyRef.current.elements().addClass('dimmed').removeClass('path-highlighted');

        const stepUsernames = new Set(res.steps);
        const pathNodes = cyRef.current.nodes().filter((n) => stepUsernames.has(n.data('username')));
        pathNodes.removeClass('dimmed').addClass('path-highlighted');

        // Tìm các cạnh nối các node trên đường đi
        for (let i = 0; i < res.steps.length - 1; i++) {
          const uA = res.steps[i];
          const uB = res.steps[i + 1];
          const edge = cyRef.current.edges().filter((e) => {
            const sUser = e.source().data('username');
            const tUser = e.target().data('username');
            return (sUser === uA && tUser === uB) || (sUser === uB && tUser === uA);
          });
          edge.removeClass('dimmed').addClass('path-highlighted');
        }

        cyRef.current.animate({
          fit: { eles: pathNodes, padding: 60 },
          duration: 400,
        });
      }
    } catch {
      showToast('Lỗi khi phân tích đường đi ngắn nhất');
    } finally {
      setIsPathSearching(false);
    }
  };

  // Xóa kết quả tìm đường đi
  const handleClearPath = () => {
    setPathResult(null);
    if (cyRef.current) {
      cyRef.current.elements().removeClass('dimmed path-highlighted');
      cyRef.current.fit(40);
    }
  };

  // Đảo ngược vị trí người dùng A <-> B
  const handleSwapPathUsers = () => {
    const temp = pathSource;
    setPathSource(pathTarget);
    setPathTarget(temp);
  };

  // Autocomplete gợi ý tìm nhanh
  const handleQuickSearchChange = async (val) => {
    setQuickSearchQuery(val);
    if (!val.trim()) {
      setQuickSuggestions([]);
      return;
    }
    try {
      const res = await analyticsApi.searchGlobal({ q: val.trim() });
      const suggestions = [
        ...(res.users || []).map((u) => ({ ...u, type: 'User', label: `@${u.username}` })),
        ...(res.topics || []).map((t) => ({ ...t, type: 'Topic', label: `#${t.name}` })),
      ];
      setQuickSuggestions(suggestions.slice(0, 5));
    } catch {
      setQuickSuggestions([]);
    }
  };

  // Xuất ảnh đồ thị PNG
  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, scale: 2, bg: isDarkCanvas ? '#0B1220' : '#FFFFFF' });
    const link = document.createElement('a');
    link.href = png64;
    link.download = `falkordb-graph-${activeMenu}-${Date.now()}.png`;
    link.click();
    showToast('Đã xuất ảnh PNG chất lượng cao thành công');
  };

  // Xuất dữ liệu đồ thị JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(graphData, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `falkordb-graph-${activeMenu}-${Date.now()}.json`;
    link.click();
    showToast('Đã xuất tệp cấu trúc JSON đồ thị');
  };

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!nodeTypeFilters.User || !nodeTypeFilters.Post || !nodeTypeFilters.Topic) count++;
    if (!relTypeFilters.FOLLOWS || !relTypeFilters.LIKED || !relTypeFilters.ABOUT) count++;
    if (timePreset !== '30d') count++;
    return count;
  }, [nodeTypeFilters, relTypeFilters, timePreset]);

  // Reset bộ lọc
  const handleResetFilters = () => {
    setNodeTypeFilters({ User: true, Post: true, Topic: true });
    setRelTypeFilters({ FOLLOWS: true, LIKED: true, ABOUT: true });
    setTimePreset('30d');
    showToast('Đã đặt lại toàn bộ bộ lọc về mặc định');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* ======================================================== */}
      {/* 1. HEADER CHÍNH (HEIGHT: 56PX)                           */}
      {/* ======================================================== */}
      <header className="h-14 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-30">
        {/* Logo & Workspace Tag */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileLeftOpen(true)}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 lg:hidden"
            aria-label="Mở danh mục điều hướng"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
              <Network className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-base tracking-tight text-[#0F172A]">FalkorDB</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-medium">
                Phân tích đồ thị
              </span>
            </div>
          </Link>
        </div>

        {/* Global Search Bar (Ctrl+K) */}
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
          <input
            type="text"
            value={quickSearchQuery}
            onChange={(e) => handleQuickSearchChange(e.target.value)}
            placeholder="Tìm đỉnh đồ thị, KOLs, cộng đồng… (gõ @user hoặc #topic)"
            className="w-full h-9 pl-9 pr-14 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#64748B] bg-white border border-[#E2E8F0] rounded px-1.5 py-0.5 pointer-events-none">
            Ctrl K
          </kbd>

          {/* Autocomplete Gợi Ý */}
          {quickSuggestions.length > 0 && (
            <div className="absolute top-11 left-0 right-0 bg-white border border-[#E2E8F0] rounded-[12px] shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[11px] font-semibold text-[#64748B] px-2.5 py-1 uppercase">Gợi ý đồ thị</div>
              {quickSuggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    handleFocusNode(item.label);
                    setQuickSuggestions([]);
                    setQuickSearchQuery('');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#F1F5F9] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {item.type === 'User' ? (
                      <Users className="h-3.5 w-3.5 text-[#2563EB]" />
                    ) : (
                      <Hash className="h-3.5 w-3.5 text-[#8B5CF6]" />
                    )}
                    <span className="font-medium text-[#0F172A]">{item.label}</span>
                  </div>
                  <span className="text-[11px] text-[#64748B]">{item.fullName || item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Header Navigation & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Quick link to Admin Portal */}
          <Link
            to="/admin"
            className="h-8 px-3 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-xs font-medium text-[#475569] hover:text-[#0F172A] flex items-center gap-1.5 transition-colors"
            title="Đến trang Quản trị viên"
          >
            <Shield className="h-3.5 w-3.5 text-[#2563EB]" />
            <span className="hidden sm:inline">Trang Quản trị</span>
          </Link>

          {/* User Profile Capsule */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
            <img
              src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=analyst`}
              alt="Avatar"
              className="w-7 h-7 rounded-full bg-slate-100 ring-1 ring-[#E2E8F0]"
            />
            <div className="hidden lg:block text-left text-xs leading-tight">
              <div className="font-semibold text-[#0F172A] truncate max-w-[100px]">{currentUser?.fullName || 'Nhà phân tích'}</div>
              <div className="text-[11px] text-[#64748B]">@{currentUser?.username || 'analyst'}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed top-16 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3.5 py-2 rounded-[10px] bg-[#0F172A] text-white text-xs flex items-center gap-2 shadow-lg">
            <Check className="h-4 w-4 text-[#10B981]" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. KHÔNG GIAN LÀM VIỆC 3 CỘT (HEIGHT: CALC(100VH - 56PX)) */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ------------------------------------------------------ */}
        {/* CỘT TRÁI: ĐIỀU HƯỚNG & BỘ LỌC (280PX HOẶC 64PX)       */}
        {/* ------------------------------------------------------ */}
        <aside
          className={`bg-white border-r border-[#E2E8F0] shrink-0 flex flex-col justify-between transition-all duration-200 z-20 ${
            isLeftCollapsed ? 'w-16' : 'w-[280px]'
          } hidden lg:flex`}
        >
          {/* Khối cuộn trên của Cột Trái */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* 1. Menu Chức Năng (1-5) */}
            <div className="space-y-1">
              {!isLeftCollapsed && (
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-3 mb-1.5 flex items-center justify-between">
                  <span>Chức năng phân tích</span>
                  <span className="text-[10px] font-normal text-slate-400">Phím 1-5</span>
                </div>
              )}

              {[
                { id: 'overview', name: 'Tổng quan hệ thống', icon: LayoutDashboard, shortcut: '1', uc: 'UC-16' },
                { id: 'explore', name: 'Khám phá đồ thị', icon: Compass, shortcut: '2', uc: 'UC-04' },
                { id: 'pagerank', name: 'KOLs & PageRank', icon: Award, shortcut: '3', uc: 'UC-13' },
                { id: 'communities', name: 'Bản đồ Cộng đồng', icon: Layers, shortcut: '4', uc: 'UC-14' },
                { id: 'shortest_path', name: 'Đường đi ngắn nhất', icon: RouteIcon, shortcut: '5', uc: 'UC-09' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveMenu(item.id);
                      if (item.id === 'overview') setViewMode('analytics');
                      else setViewMode('graph');
                    }}
                    title={item.name}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all duration-150 btn-press ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#2563EB] border-l-4 border-[#2563EB]'
                        : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                      {!isLeftCollapsed && <span>{item.name}</span>}
                    </div>
                    {!isLeftCollapsed && (
                      <kbd className="text-[10px] text-slate-400 bg-white border border-[#E2E8F0] rounded px-1.5 py-0.2">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 2. Khối Bộ Lọc (Accordion) */}
            {!isLeftCollapsed && (
              <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-[#2563EB]" />
                    <span className="text-xs font-semibold text-[#0F172A]">Bộ lọc đồ thị</span>
                    {activeFiltersCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] text-[#64748B] hover:text-[#2563EB] hover:underline"
                  >
                    Đặt lại
                  </button>
                </div>

                {/* Loại Node */}
                <div className="space-y-1.5 bg-[#F8FAFC] p-2.5 rounded-[10px] border border-[#E2E8F0]/70">
                  <label className="text-[11px] font-medium text-[#475569] block">Loại Node (Đỉnh)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'User', label: 'Người dùng', color: 'bg-[#2563EB]' },
                      { key: 'Post', label: 'Bài viết', color: 'bg-[#F97316]' },
                      { key: 'Topic', label: 'Chủ đề', color: 'bg-[#8B5CF6]' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setNodeTypeFilters((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                        }
                        className={`px-2 py-1 rounded-[6px] text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                          nodeTypeFilters[item.key]
                            ? 'bg-white border-[#CBD5E1] text-[#0F172A] shadow-xs'
                            : 'bg-transparent border-transparent text-[#94A3B8] opacity-60'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loại Quan Hệ */}
                <div className="space-y-1.5 bg-[#F8FAFC] p-2.5 rounded-[10px] border border-[#E2E8F0]/70">
                  <label className="text-[11px] font-medium text-[#475569] block">Quan hệ (Cạnh)</label>
                  <div className="space-y-1">
                    {[
                      { key: 'FOLLOWS', label: 'Theo dõi (FOLLOWS)', style: 'solid', color: 'text-[#64748B]' },
                      { key: 'LIKED', label: 'Thích (LIKED)', style: 'solid', color: 'text-[#EC4899]' },
                      { key: 'ABOUT', label: 'Chủ đề (ABOUT)', style: 'dashed', color: 'text-[#A855F7]' },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between text-xs text-[#334155] cursor-pointer hover:text-[#0F172A]"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={relTypeFilters[item.key]}
                            onChange={() =>
                              setRelTypeFilters((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                            }
                            className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]"
                          />
                          <span>{item.label}</span>
                        </div>
                        <span className={`text-[10px] font-mono ${item.color}`}>
                          {item.style === 'dashed' ? '- - -' : '───'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Khoảng Thời Gian */}
                <div className="space-y-1.5 bg-[#F8FAFC] p-2.5 rounded-[10px] border border-[#E2E8F0]/70">
                  <label className="text-[11px] font-medium text-[#475569] block">Khoảng thời gian</label>
                  <div className="grid grid-cols-4 gap-1 text-[11px]">
                    {['7d', '30d', '90d', 'custom'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTimePreset(preset)}
                        className={`py-1 rounded text-center font-medium transition-colors ${
                          timePreset === preset
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-white text-[#475569] hover:bg-slate-100'
                        }`}
                      >
                        {preset === '7d' ? '7N' : preset === '30d' ? '30N' : preset === '90d' ? '90N' : 'Tùy ý'}
                      </button>
                    ))}
                  </div>
                  {timePreset === 'custom' && (
                    <div className="pt-1.5 space-y-1">
                      <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                        className="w-full text-[11px] p-1 bg-white border border-[#CBD5E1] rounded"
                      />
                      <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                        className="w-full text-[11px] p-1 bg-white border border-[#CBD5E1] rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nút thu gọn / mở rộng Sidebar Trái */}
          <div className="p-2 border-t border-[#E2E8F0] flex items-center justify-between">
            {!isLeftCollapsed && (
              <span className="text-[11px] text-[#64748B] pl-2">Thu gọn menu</span>
            )}
            <button
              type="button"
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] mx-auto"
              title={isLeftCollapsed ? 'Mở rộng cột' : 'Thu gọn cột'}
            >
              {isLeftCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </aside>

        {/* ------------------------------------------------------ */}
        {/* CỘT GIỮA: KHÔNG GIAN LÀM VIỆC CHÍNH (FLEX-1)          */}
        {/* ------------------------------------------------------ */}
        <main className="flex-1 min-w-[560px] flex flex-col overflow-hidden bg-[#F8FAFC] relative">
          {/* Header thanh công cụ Cột Giữa */}
          <div className="h-12 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between gap-3 shrink-0 z-10">
            {/* Tên chức năng hiện tại */}
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[#0F172A]">
                {activeMenu === 'overview' && 'Tổng quan hệ thống (UC-16)'}
                {activeMenu === 'explore' && 'Khám phá cấu trúc đồ thị (UC-04)'}
                {activeMenu === 'pagerank' && 'Phân tích KOLs & PageRank (UC-13)'}
                {activeMenu === 'communities' && 'Bản đồ Phân cụm Cộng đồng WCC (UC-14)'}
                {activeMenu === 'shortest_path' && 'Tìm đường đi ngắn nhất (UC-09)'}
              </h1>
              <span className="text-xs text-[#64748B] hidden md:inline">
                • {graphData.nodes.length} đỉnh, {graphData.edges.length} cạnh
              </span>
            </div>

            {/* Chuyển Đổi Chế Độ & Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Tab Switch Đồ thị / Thống kê */}
              <div className="bg-[#F1F5F9] p-0.5 rounded-[8px] flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('graph')}
                  className={`px-2.5 py-1 rounded-[6px] font-medium transition-all ${
                    viewMode === 'graph' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Đồ thị
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('analytics')}
                  className={`px-2.5 py-1 rounded-[6px] font-medium transition-all ${
                    viewMode === 'analytics' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Thống kê
                </button>
              </div>

              {/* Nút Xuất PNG / JSON */}
              <button
                type="button"
                onClick={handleExportPNG}
                className="h-7 px-2.5 rounded-[6px] border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                title="Xuất ảnh PNG đồ thị"
              >
                <Download className="h-3.5 w-3.5 text-[#64748B]" />
                <span className="hidden sm:inline">PNG</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="h-7 px-2.5 rounded-[6px] border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                title="Xuất dữ liệu JSON"
              >
                <FileText className="h-3.5 w-3.5 text-[#64748B]" />
                <span className="hidden sm:inline">JSON</span>
              </button>

              {/* Toggle Right Panel */}
              <button
                type="button"
                onClick={() => setIsRightVisible(!isRightVisible)}
                className={`p-1.5 rounded-lg border border-[#E2E8F0] transition-colors ${
                  isRightVisible ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-white text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Bật/tắt thanh thuộc tính & xếp hạng"
              >
                <Sliders className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* VÙNG 1: CANVAS ĐỒ THỊ CYTOSCAPE (HIỂN THỊ KHI VIEWMODE === 'GRAPH') */}
          {viewMode === 'graph' && (
            <div className={`flex-1 relative overflow-hidden transition-colors ${isDarkCanvas ? 'bg-[#0B1220]' : 'bg-[#F8FAFC]'}`}>
              {/* VÙNG 2: THANH CÔNG CỤ TÌM ĐƯỜNG ĐI (UC-09) NỔI TRÊN CANVAS */}
              {activeMenu === 'shortest_path' && (
                <div className="absolute top-3 left-4 right-4 z-20 max-w-2xl mx-auto bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-[12px] p-3 shadow-lg space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RouteIcon className="h-4 w-4 text-[#2563EB]" />
                      <span className="text-xs font-semibold text-[#0F172A]">Tìm đường đi ngắn nhất giữa hai người dùng (UC-09)</span>
                    </div>
                    {pathResult && (
                      <button
                        type="button"
                        onClick={handleClearPath}
                        className="text-[11px] text-[#64748B] hover:text-red-600 hover:underline"
                      >
                        Xóa kết quả
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={pathSource}
                        onChange={(e) => setPathSource(e.target.value)}
                        placeholder="Người dùng A (vd: alice)"
                        className="w-full h-8 px-2.5 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSwapPathUsers}
                      className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-100 text-[#64748B]"
                      title="Đảo vị trí A <-> B"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={pathTarget}
                        onChange={(e) => setPathTarget(e.target.value)}
                        placeholder="Người dùng B (vd: david)"
                        className="w-full h-8 px-2.5 bg-slate-50 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isPathSearching}
                      onClick={handleAnalyzePath}
                      className="h-8 px-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isPathSearching && <RefreshCw className="h-3 w-3 animate-spin" />}
                      <span>Phân tích</span>
                    </button>
                  </div>

                  {/* Kết quả Breadcrumbs đường đi */}
                  {pathResult && (
                    <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-emerald-600">Độ dài: {pathResult.length} bước</span>
                        <span className="text-slate-400">•</span>
                        {pathResult.steps?.map((step, idx) => (
                          <React.Fragment key={idx}>
                            <button
                              type="button"
                              onClick={() => handleFocusNode(step)}
                              className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono font-medium hover:bg-amber-100"
                            >
                              @{step}
                            </button>
                            {idx < pathResult.steps.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cytoscape Container */}
              <div ref={cyContainerRef} className="w-full h-full" />

              {/* Toolbar Nổi Góc Trên Phải Canvas */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-[10px] border border-[#E2E8F0] shadow-md">
                <button
                  type="button"
                  onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A]"
                  title="Phóng to (Zoom In)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A]"
                  title="Thu nhỏ (Zoom Out)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => cyRef.current?.fit(40)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A]"
                  title="Vừa màn hình (Fit)"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <div className="h-px bg-[#E2E8F0] my-0.5" />
                <button
                  type="button"
                  onClick={() => setIsDarkCanvas(!isDarkCanvas)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDarkCanvas ? 'bg-[#0F172A] text-amber-400' : 'hover:bg-slate-100 text-[#64748B]'
                  }`}
                  title={isDarkCanvas ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối đồ thị (Dark Canvas)'}
                >
                  {isDarkCanvas ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>

              {/* Legend (Chú Giải) Nổi Góc Dưới Trái */}
              <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3 rounded-[12px] border border-[#E2E8F0] shadow-md max-w-xs text-xs space-y-2">
                <div className="font-semibold text-[#0F172A] text-[11px] uppercase tracking-wider flex items-center justify-between">
                  <span>Chú giải đồ thị</span>
                  <span className="text-[10px] text-slate-400 font-normal">Kích thước ~ PageRank</span>
                </div>

                {/* Chú giải loại Node */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <span className="text-[11px] text-[#475569]">User</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                    <span className="text-[11px] text-[#475569]">Post</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                    <span className="text-[11px] text-[#475569]">Topic</span>
                  </div>
                </div>

                {/* Chú giải 8 Màu Cộng đồng (UC-14) - Có thể bấm để highlight */}
                <div className="pt-1.5 border-t border-[#E2E8F0]/70">
                  <div className="text-[10px] text-[#64748B] mb-1">Cộng đồng WCC (Bấm để làm nổi):</div>
                  <div className="flex flex-wrap gap-1">
                    {COMMUNITY_COLORS.map((color, idx) => {
                      const cid = String(idx + 1);
                      const isHighlighted = activeCommunityHighlight === cid;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => handleHighlightCommunity(cid)}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white transition-transform ${
                            isHighlighted ? 'scale-125 ring-2 ring-black' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Cộng đồng #${cid} (Bấm để lọc)`}
                        >
                          {cid}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Banner Chỉ Số Hiệu Năng Đồ Thị */}
              <div className="absolute bottom-4 right-4 z-10 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs border border-[#E2E8F0] shadow-xs text-[11px] text-[#64748B] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Hiển thị {graphData.nodes.length} node • LOD Tự động</span>
              </div>
            </div>
          )}

          {/* VÙNG 3: BIỂU ĐỒ THỐNG KÊ (HIỂN THỊ KHI VIEWMODE === 'ANALYTICS') */}
          {viewMode === 'analytics' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Thẻ Thống Kê Tổng Quan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-1">
                  <div className="text-xs text-[#64748B] font-medium flex items-center justify-between">
                    <span>Tổng Đỉnh (Nodes)</span>
                    <Users className="h-4 w-4 text-[#2563EB]" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-[#0F172A]">
                    {stats?.totalNodes?.toLocaleString('vi-VN') || '40.050'}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>+8.4% so với tuần trước</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-1">
                  <div className="text-xs text-[#64748B] font-medium flex items-center justify-between">
                    <span>Tổng Cạnh Quan Hệ (Edges)</span>
                    <Share2 className="h-4 w-4 text-[#F97316]" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-[#0F172A]">
                    {stats?.totalEdges?.toLocaleString('vi-VN') || '386.500'}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>+15.2% tương tác mới</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-1">
                  <div className="text-xs text-[#64748B] font-medium flex items-center justify-between">
                    <span>Số Cụm Cộng Đồng (WCC)</span>
                    <Layers className="h-4 w-4 text-[#8B5CF6]" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-[#0F172A]">
                    {communitiesList.length || 6} cụm
                  </div>
                  <div className="text-[11px] text-[#64748B]">Độ phân rã đồ thị chuẩn modularity</div>
                </div>
              </div>

              {/* Biểu đồ cột Tương tác theo Chủ đề (UC-10, UC-16) */}
              <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">
                      Tương tác theo Chủ đề thảo luận (UC-10)
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      So sánh lượt Thích (Like), Bình luận (Comment) và Chia sẻ trên các Topic hàng đầu
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setChartMetric('all')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        chartMetric === 'all' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-[#64748B]'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('likes')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        chartMetric === 'likes' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-[#64748B]'
                      }`}
                    >
                      Chỉ Like
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('comments')}
                      className={`px-2 py-0.5 rounded font-medium ${
                        chartMetric === 'comments' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-[#64748B]'
                      }`}
                    >
                      Chỉ Comment
                    </button>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendingTopics} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '12px',
                        }}
                      />
                      {(chartMetric === 'all' || chartMetric === 'likes') && (
                        <Bar dataKey="likes" name="Lượt Thích" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      )}
                      {(chartMetric === 'all' || chartMetric === 'comments') && (
                        <Bar dataKey="comments" name="Bình luận" fill="#F97316" radius={[4, 4, 0, 0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Biểu đồ phân phối bậc (Degree Distribution) */}
              <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A]">
                    Phân phối bậc đồ thị (Degree Distribution)
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Phân bố số lượng liên kết theo luật hàm mũ (Power-law distribution) điển hình của mạng xã hội
                  </p>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats?.degreeBuckets || [
                        { bucket: '1-5', count: 4800 },
                        { bucket: '6-15', count: 2600 },
                        { bucket: '16-30', count: 1400 },
                        { bucket: '31-60', count: 750 },
                        { bucket: '61-120', count: 320 },
                        { bucket: '>120', count: 80 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" name="Số lượng Node" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ------------------------------------------------------ */}
        {/* CỘT PHẢI: CHỈ SỐ & CHI TIẾT (340PX)                   */}
        {/* ------------------------------------------------------ */}
        {isRightVisible && (
          <aside className="w-[340px] bg-white border-l border-[#E2E8F0] shrink-0 flex flex-col justify-between overflow-y-auto p-4 space-y-4 z-20">
            {/* WIDGET 1: LƯỚI THẺ CHỈ SỐ TỔNG QUAN 2x2 (UC-16) */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Chỉ số tổng quan (UC-16)
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0] space-y-1">
                  <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                    <span>Tổng User</span>
                    <Users className="h-3.5 w-3.5 text-[#2563EB]" />
                  </div>
                  <div className="text-base font-bold tabular-nums text-[#0F172A]">
                    {stats?.nodes?.User?.toLocaleString('vi-VN') || '10.000'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">↑ +4.2% tuần này</div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0] space-y-1">
                  <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                    <span>Tổng Post</span>
                    <FileText className="h-3.5 w-3.5 text-[#F97316]" />
                  </div>
                  <div className="text-base font-bold tabular-nums text-[#0F172A]">
                    {stats?.nodes?.Post?.toLocaleString('vi-VN') || '30.000'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">↑ +11.8% bài mới</div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0] space-y-1">
                  <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                    <span>Quan hệ</span>
                    <Share2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
                  </div>
                  <div className="text-base font-bold tabular-nums text-[#0F172A]">
                    {stats?.totalEdges?.toLocaleString('vi-VN') || '386.500'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">↑ +18.5% kết nối</div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-[10px] border border-[#E2E8F0] space-y-1">
                  <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                    <span>Độ trễ Cypher</span>
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div className="text-base font-bold tabular-nums text-[#0F172A]">
                    14.2 ms
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">↓ Tối ưu -22%</div>
                </div>
              </div>
            </div>

            {/* WIDGET 2: CHI TIẾT THỰC THỂ (INSPECTOR - UC-04) */}
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] flex items-center justify-between">
                <span>Chi tiết thực thể (Inspector)</span>
                {selectedNode && (
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    className="text-[10px] text-[#64748B] hover:text-red-600"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>

              {!selectedNode ? (
                <div className="p-6 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-[12px] text-center space-y-2">
                  <CircleDot className="h-6 w-6 text-[#94A3B8] mx-auto stroke-[1.5]" />
                  <div className="text-xs font-medium text-[#475569]">Chưa chọn đỉnh nào</div>
                  <p className="text-[11px] text-[#64748B]">
                    Nhấp vào một node trên đồ thị để kiểm tra thuộc tính, PageRank và cộng đồng.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-[12px] shadow-xs space-y-3 animate-in fade-in zoom-in-95 duration-100">
                  {/* Entity Header */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center font-bold text-[#2563EB] text-sm shrink-0">
                      {selectedNode.username?.charAt(0).toUpperCase() || selectedNode.type?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-[#0F172A] truncate">
                        {selectedNode.fullName || selectedNode.label}
                      </div>
                      <div className="text-[11px] text-[#64748B] truncate">
                        ID: {selectedNode.id}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#F1F5F9] text-[#475569]">
                      {selectedNode.type}
                    </span>
                  </div>

                  {/* Properties Table */}
                  <div className="space-y-1.5 text-xs">
                    {selectedNode.followers !== undefined && (
                      <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Người theo dõi:</span>
                        <span className="font-semibold text-[#0F172A] tabular-nums">
                          {selectedNode.followers?.toLocaleString('vi-VN')}
                        </span>
                      </div>
                    )}
                    {selectedNode.pagerank !== undefined && (
                      <div className="py-1 border-b border-[#F1F5F9] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Điểm PageRank:</span>
                          <span className="font-semibold text-[#2563EB] tabular-nums">
                            {(selectedNode.pagerank * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full"
                            style={{ width: `${Math.min(100, selectedNode.pagerank * 200)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {selectedNode.community !== undefined && (
                      <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">ID Cộng đồng (WCC):</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: selectedNode.communityColor || '#2563EB' }}
                        >
                          Cụm #{selectedNode.community}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleExpandNeighborhood(selectedNode.id)}
                      className="h-7 px-2 bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1] rounded-[8px] text-[11px] font-medium text-[#334155] flex items-center justify-center gap-1 transition-colors"
                    >
                      <Sparkles className="h-3 w-3 text-[#2563EB]" />
                      <span>Mở rộng</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedNode.username) {
                          setPathSource(selectedNode.username);
                          setActiveMenu('shortest_path');
                          showToast(`Đã đặt @${selectedNode.username} làm điểm A`);
                        }
                      }}
                      className="h-7 px-2 bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1] rounded-[8px] text-[11px] font-medium text-[#334155] flex items-center justify-center gap-1 transition-colors"
                    >
                      <RouteIcon className="h-3 w-3 text-[#F97316]" />
                      <span>Đặt điểm A</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* WIDGET 3: BẢNG XẾP HẠNG TOP KOLS & CỘNG ĐỒNG (UC-13, UC-14) */}
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Bảng xếp hạng (UC-13)
                </span>
                <span className="text-[10px] text-[#2563EB] font-medium">PageRank Top</span>
              </div>

              <div className="space-y-1.5">
                {kolsList.slice(0, 6).map((kol) => (
                  <div
                    key={kol.id}
                    onClick={() => handleFocusNode(kol.username)}
                    className="p-2 rounded-[8px] border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] cursor-pointer flex items-center justify-between transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          kol.rank === 1
                            ? 'bg-amber-400 text-amber-950'
                            : kol.rank === 2
                            ? 'bg-slate-300 text-slate-800'
                            : kol.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-[#64748B]'
                        }`}
                      >
                        {kol.rank}
                      </span>
                      <div>
                        <div className="font-semibold text-[#0F172A]">@{kol.username}</div>
                        <div className="text-[10px] text-[#64748B]">{kol.fullName}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-[#2563EB] tabular-nums text-[11px]">
                        PR: {(kol.pagerank * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-[#64748B] tabular-nums">
                        {kol.followers?.toLocaleString('vi-VN')} flw
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Responsive Mobile Drawer cho Cột Trái */}
      {isMobileLeftOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsMobileLeftOpen(false)}
          />
          <div className="relative w-72 bg-white h-full shadow-2xl flex flex-col p-4 z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <span className="font-semibold text-sm text-[#0F172A]">Menu Phân tích</span>
              <button onClick={() => setIsMobileLeftOpen(false)} className="text-[#64748B]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-3 space-y-1">
              {[
                { id: 'overview', name: 'Tổng quan hệ thống', icon: LayoutDashboard },
                { id: 'explore', name: 'Khám phá đồ thị', icon: Compass },
                { id: 'pagerank', name: 'KOLs & PageRank', icon: Award },
                { id: 'communities', name: 'Bản đồ Cộng đồng', icon: Layers },
                { id: 'shortest_path', name: 'Đường đi ngắn nhất', icon: RouteIcon },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveMenu(item.id);
                    setIsMobileLeftOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                    activeMenu === item.id ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#475569]'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
