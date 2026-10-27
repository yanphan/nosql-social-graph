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
  Download,
  Share2,
  Layers,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  ArrowLeftRight,
  Check,
  Info,
  Calendar,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  FileText,
  Hash,
  CircleDot,
  Shield,
  TrendingUp,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
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
export const COMMUNITY_COLORS = [
  '#2563EB', // 1. Xanh dương
  '#F97316', // 2. Cam
  '#10B981', // 3. Xanh lá
  '#8B5CF6', // 4. Tím
  '#EF4444', // 5. Đỏ
  '#EAB308', // 6. Vàng
  '#EC4899', // 7. Hồng
  '#64748B', // 8. Xám slate
];

// Màu node theo loại thực thể
export const NODE_TYPE_COLORS = {
  User: '#2563EB', // Xanh dương
  Post: '#F97316', // Cam
  Topic: '#8B5CF6', // Tím
};

// 7 loại quan hệ trong đồ thị FalkorDB Social
export const ALL_REL_TYPES = [
  { key: 'FOLLOWS', vi: 'Theo dõi', en: 'FOLLOWS', count: 150000, color: '#64748B', style: 'solid' },
  { key: 'LIKED', vi: 'Thích bài viết', en: 'LIKED', count: 90000, color: '#EC4899', style: 'solid' },
  { key: 'ABOUT', vi: 'Thuộc chủ đề', en: 'ABOUT', count: 60000, color: '#A855F7', style: 'dashed' },
  { key: 'POSTED', vi: 'Đăng tải', en: 'POSTED', count: 30000, color: '#F97316', style: 'solid' },
  { key: 'INTERESTED_IN', vi: 'Quan tâm chủ đề', en: 'INTERESTED_IN', count: 25000, color: '#2563EB', style: 'dashed' },
  { key: 'COMMENTED', vi: 'Bình luận', en: 'COMMENTED', count: 22500, color: '#10B981', style: 'solid' },
  { key: 'SHARED', vi: 'Chia sẻ', en: 'SHARED', count: 9000, color: '#F59E0B', style: 'solid' },
];

export const EDGE_COLORS = {
  FOLLOWS: '#64748B',
  LIKED: '#EC4899',
  ABOUT: '#A855F7',
  POSTED: '#F97316',
  INTERESTED_IN: '#2563EB',
  COMMENTED: '#10B981',
  SHARED: '#F59E0B',
};

// Chuẩn hóa định dạng số vi-VN
export const formatNumberVi = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('vi-VN').format(val);
};

export const formatDecimalVi = (val, digits = 1) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(val);
};

export const formatPctVi = (val, digits = 1) => {
  return `${formatDecimalVi(val, digits)}%`;
};

// Chuẩn hóa tên Topic hiển thị đúng ngữ nghĩa
export const normalizeTopicName = (rawName) => {
  if (!rawName) return '';
  const clean = String(rawName).trim().replace(/^#/, '');
  const lower = clean.toLowerCase();
  const map = {
    ai: 'AI',
    nosql: 'NoSQL',
    react: 'React',
    nodejs: 'Node.js',
    'node.js': 'Node.js',
    falkordb: 'FalkorDB',
    graphdb: 'GraphDB',
    javascript: 'JavaScript',
    python: 'Python',
    database: 'Database',
    docker: 'Docker',
    devops: 'DevOps',
    redis: 'Redis',
    mongodb: 'MongoDB',
    typescript: 'TypeScript',
  };
  return map[lower] || (clean.charAt(0).toUpperCase() + clean.slice(1));
};

export default function AnalystPage() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => authService.getStoredUser());

  // Navigation: 'overview' | 'explore' | 'pagerank' | 'communities' | 'shortest_path'
  const [activeMenu, setActiveMenu] = useState('overview');

  // Chế độ hiển thị Cột giữa: 'graph' (Đồ thị) | 'analytics' (Thống kê)
  const [viewMode, setViewMode] = useState('analytics');

  // Layout Responsive States
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightVisible, setIsRightVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('analyst_right_col_visible');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleRightVisible = () => {
    setIsRightVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('analyst_right_col_visible', String(next));
      } catch {}
      return next;
    });
  };

  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);

  // Graph Canvas Dark Mode Toggle
  const [isDarkCanvas, setIsDarkCanvas] = useState(false);

  // Layout Engine
  const [graphLayout, setGraphLayout] = useState('fcose'); // 'fcose' | 'circle' | 'concentric'

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
    POSTED: true,
    INTERESTED_IN: true,
    COMMENTED: true,
    SHARED: true,
  });

  const [timePreset, setTimePreset] = useState('30d'); // '7d' | '30d' | '90d' | 'custom'
  const [dateRange, setDateRange] = useState({
    from: '2026-09-27',
    to: '2026-10-27',
  });

  // Global & Sidebar Searches
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [sidebarSuggestions, setSidebarSuggestions] = useState([]);

  // Shortest Path Tool State
  const [pathSource, setPathSource] = useState('alice');
  const [pathTarget, setPathTarget] = useState('david');
  const [pathMaxDepth, setPathMaxDepth] = useState(6);
  const [pathResult, setPathResult] = useState(null);
  const [isPathSearching, setIsPathSearching] = useState(false);

  // Chart Interactive Filters ('all' | 'likes' | 'comments' | 'shares')
  const [chartMetric, setChartMetric] = useState('all');

  // Accordion widgets collapse state in Right Column
  const [collapsedWidgets, setCollapsedWidgets] = useState({
    relTypes: false,
    influencers: false,
    hotTopics: false,
    entityDetail: false,
  });

  const toggleWidget = (key) => {
    setCollapsedWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Refs
  const cyContainerRef = useRef(null);
  const cyRef = useRef(null);

  // Toast Notification Trigger
  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Phím tắt toàn cục (1-5 chuyển chức năng, ] hoặc Alt+R ẩn hiện cột phải, Esc bỏ chọn)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === '1') {
        setActiveMenu('overview');
        setViewMode('analytics');
      } else if (e.key === '2') {
        setActiveMenu('explore');
        setViewMode('graph');
      } else if (e.key === '3') {
        setActiveMenu('pagerank');
        setViewMode('graph');
      } else if (e.key === '4') {
        setActiveMenu('communities');
        setViewMode('graph');
      } else if (e.key === '5') {
        setActiveMenu('shortest_path');
        setViewMode('graph');
      } else if (e.key === ']' || (e.altKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        toggleRightVisible();
      } else if (e.key === 'Escape') {
        setSelectedNode(null);
        if (cyRef.current) {
          cyRef.current.elements().removeClass('dimmed highlighted path-highlighted');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tải toàn bộ dữ liệu ban đầu
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
      setError('Không thể kết nối đến backend. Đang sử dụng chế độ ngoại tuyến dự phòng.');
    } finally {
      setLoading(false);
    }
  };

  // Khởi tạo và cập nhật Cytoscape Canvas khi ở tab đồ thị
  useEffect(() => {
    if (activeMenu === 'overview' || !cyContainerRef.current) return;

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
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-size': '11px',
            'font-weight': 500,
            color: isDarkCanvas ? '#E2E8F0' : '#1E293B',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-background-opacity': isDarkCanvas ? 0.75 : 0.85,
            'text-background-color': isDarkCanvas ? '#0B1220' : '#FFFFFF',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            width: (ele) => {
              const type = ele.data('type');
              if (type === 'Topic') return 40;
              if (type === 'Post') return 34;
              const pr = ele.data('pagerank') || 0.05;
              return Math.max(26, Math.min(58, Math.round(Math.sqrt(pr) * 85)));
            },
            height: (ele) => {
              const type = ele.data('type');
              if (type === 'Topic') return 40;
              if (type === 'Post') return 26;
              const pr = ele.data('pagerank') || 0.05;
              return Math.max(26, Math.min(58, Math.round(Math.sqrt(pr) * 85)));
            },
            shape: (ele) => {
              const type = ele.data('type');
              if (type === 'Topic') return 'diamond';
              if (type === 'Post') return 'round-rectangle';
              return 'ellipse';
            },
            'background-color': (ele) => {
              if (activeMenu === 'communities') {
                return ele.data('communityColor') || '#2563EB';
              }
              return NODE_TYPE_COLORS[ele.data('type')] || '#2563EB';
            },
            'border-width': 2,
            'border-color': isDarkCanvas ? '#1E293B' : '#FFFFFF',
            'transition-property': 'background-color, border-color, width, height, opacity',
            'transition-duration': '0.2s',
          },
        },
        {
          selector: 'node[type = "Topic"]',
          style: {
            'border-width': 3,
            'border-color': '#FFFFFF',
            'font-weight': 600,
            'font-size': '12px',
          },
        },
        {
          selector: 'node[?isKOL]',
          style: {
            'border-width': 3.5,
            'border-color': '#F59E0B',
            'font-weight': 600,
            'font-size': '12px',
            'shadow-blur': 14,
            'shadow-color': '#F59E0B',
            'shadow-opacity': 0.6,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': (ele) => EDGE_COLORS[ele.data('type')] || '#94A3B8',
            'target-arrow-color': (ele) => EDGE_COLORS[ele.data('type')] || '#94A3B8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.85,
            opacity: isDarkCanvas ? 0.5 : 0.65,
            'line-style': (ele) => (ele.data('type') === 'ABOUT' || ele.data('type') === 'INTERESTED_IN' ? 'dashed' : 'solid'),
          },
        },
        {
          selector: 'edge[type = "ABOUT"]',
          style: {
            width: 2,
            'line-style': 'dashed',
            'line-color': '#A855F7',
            'target-arrow-color': '#A855F7',
          },
        },
        {
          selector: 'node:active, node:hover',
          style: {
            'border-width': 3.5,
            'border-color': '#3B82F6',
            'shadow-blur': 14,
            'shadow-color': '#2563EB',
            'shadow-opacity': 0.6,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#2563EB',
            'shadow-blur': 18,
            'shadow-color': '#2563EB',
            'shadow-opacity': 0.8,
          },
        },
        {
          selector: '.dimmed',
          style: {
            opacity: 0.1,
          },
        },
        {
          selector: '.highlighted',
          style: {
            opacity: 1,
            'border-width': 3.5,
            'border-color': '#FFFFFF',
            'shadow-blur': 16,
            'shadow-opacity': 0.85,
          },
        },
        {
          selector: '.path-highlighted',
          style: {
            opacity: 1,
            'border-color': '#EAB308',
            'border-width': 4.5,
            'line-color': '#EAB308',
            'target-arrow-color': '#EAB308',
            width: 4,
            'shadow-blur': 20,
            'shadow-color': '#EAB308',
            'shadow-opacity': 0.95,
          },
        },
      ],
      layout: {
        name: graphLayout === 'fcose' ? 'cose' : graphLayout,
        animate: true,
        animationDuration: 600,
        randomize: true,
        fit: true,
        padding: 60,
        componentSpacing: 80,
        nodeRepulsion: 12000,
        idealEdgeLength: 85,
        edgeElasticity: 100,
        gravity: 0.2,
        numIter: 1000,
      },
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode(node.data());
      const neighborhood = node.neighborhood().add(node);
      cy.elements().addClass('dimmed');
      neighborhood.removeClass('dimmed');
    });

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

  // Highlight cộng đồng cụ thể khi click từ danh sách
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
    if (activeMenu === 'overview') {
      setActiveMenu('explore');
      setViewMode('graph');
    }
    setTimeout(() => {
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
    }, 100);
  };

  // Mở rộng láng giềng (+1 Hop)
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

  // Phân tích đường đi ngắn nhất
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

      if (cyRef.current && res && res.steps && res.steps.length > 0) {
        cyRef.current.elements().addClass('dimmed').removeClass('path-highlighted');

        const stepUsernames = new Set(res.steps);
        const pathNodes = cyRef.current.nodes().filter((n) => stepUsernames.has(n.data('username')));
        pathNodes.removeClass('dimmed').addClass('path-highlighted');

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

  // Autocomplete tìm kiếm toàn cục
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

  // Autocomplete tìm nhanh trong Sidebar
  const handleSidebarSearchChange = async (val) => {
    setSidebarSearchQuery(val);
    if (!val.trim()) {
      setSidebarSuggestions([]);
      return;
    }
    try {
      const res = await analyticsApi.searchGlobal({ q: val.trim() });
      const suggestions = [
        ...(res.users || []).map((u) => ({ ...u, type: 'User', label: `@${u.username}` })),
        ...(res.topics || []).map((t) => ({ ...t, type: 'Topic', label: `#${t.name}` })),
      ];
      setSidebarSuggestions(suggestions.slice(0, 5));
    } catch {
      setSidebarSuggestions([]);
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
    const activeRelKeys = Object.values(relTypeFilters).filter(Boolean).length;
    if (activeRelKeys < ALL_REL_TYPES.length) count++;
    if (timePreset !== '30d') count++;
    return count;
  }, [nodeTypeFilters, relTypeFilters, timePreset]);

  // Reset bộ lọc
  const handleResetFilters = () => {
    setNodeTypeFilters({ User: true, Post: true, Topic: true });
    setRelTypeFilters({
      FOLLOWS: true,
      LIKED: true,
      ABOUT: true,
      POSTED: true,
      INTERESTED_IN: true,
      COMMENTED: true,
      SHARED: true,
    });
    setTimePreset('30d');
    showToast('Đã đặt lại toàn bộ bộ lọc về mặc định');
  };

  // Tính toán số liệu Tổng quan hệ thống (Logic & Số liệu chuẩn hóa)
  const totalNodes = stats?.totalNodes || 40050;
  const totalEdges = stats?.totalEdges || 386500;

  // Bậc trung bình: có hướng E / V; nếu coi vô hướng 2E / V
  const avgDegreeDirected = totalNodes > 0 ? totalEdges / totalNodes : 0;
  const avgDegreeUndirected = totalNodes > 0 ? (2 * totalEdges) / totalNodes : 0;

  // Mật độ mạng (Network Density): density = E / (V * (V - 1)) * 100%
  const networkDensity =
    totalNodes > 1 ? (totalEdges / (totalNodes * (totalNodes - 1))) * 100 : 0;

  // Dữ liệu biểu đồ Chủ đề chuẩn hóa
  const chartData = useMemo(() => {
    const source =
      trendingTopics.length > 0
        ? trendingTopics
        : [
            { name: 'ai', likes: 21500, comments: 8400, shares: 3200 },
            { name: 'nosql', likes: 18200, comments: 6100, shares: 2500 },
            { name: 'react', likes: 16400, comments: 5300, shares: 2100 },
            { name: 'falkordb', likes: 15100, comments: 4900, shares: 1900 },
            { name: 'graphdb', likes: 13800, comments: 4200, shares: 1700 },
            { name: 'nodejs', likes: 12500, comments: 3800, shares: 1500 },
            { name: 'javascript', likes: 11200, comments: 3400, shares: 1300 },
            { name: 'python', likes: 9800, comments: 2900, shares: 1100 },
          ];

    return source.map((t) => ({
      ...t,
      displayName: normalizeTopicName(t.name),
      likes: t.likes || 0,
      comments: t.comments || 0,
      shares: t.shares || Math.round((t.likes || 1000) * 0.15),
      interactions: (t.likes || 0) + (t.comments || 0) * 2 + ((t.shares || 0) * 3),
    }));
  }, [trendingTopics]);

  // Phân tích ma trận quan hệ động
  const maxRelCount = useMemo(() => Math.max(...ALL_REL_TYPES.map((r) => r.count)), []);

  const macroAnalysisText = useMemo(() => {
    const follows = ALL_REL_TYPES.find((r) => r.key === 'FOLLOWS')?.count || 150000;
    const liked = ALL_REL_TYPES.find((r) => r.key === 'LIKED')?.count || 90000;
    const combinedPct = formatDecimalVi(((follows + liked) / totalEdges) * 100, 1);
    const followsPct = formatDecimalVi((follows / totalEdges) * 100, 1);
    const likedPct = formatDecimalVi((liked / totalEdges) * 100, 1);

    return `Mạng lưới sở hữu cấu trúc tương tác gắn kết. Hai loại quan hệ chính gồm Theo dõi (${followsPct}%) và Thích bài viết (${likedPct}%) chiếm tổng cộng ${combinedPct}% toàn bộ liên kết đồ thị, phản ánh mức độ tương tác người dùng cao và lưu lượng nội dung lan truyền ổn định.`;
  }, [totalEdges]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* ======================================================== */}
      {/* 1. HEADER CHÍNH (HEIGHT: 56PX)                           */}
      {/* ======================================================== */}
      <header className="h-14 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-30">
        {/* Logo & Workspace Tag */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileLeftOpen(true)}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 lg:hidden"
            aria-label="Mở danh mục điều hướng"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
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
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#475569] bg-[#F1F5F9] border border-[#CBD5E1] rounded px-1.5 py-0.5 pointer-events-none shadow-2xs">
            Ctrl K
          </kbd>

          {quickSuggestions.length > 0 && (
            <div className="absolute top-11 left-0 right-0 bg-white border border-[#E2E8F0] rounded-[12px] shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-xs font-semibold text-[#64748B] px-2.5 py-1 uppercase">Gợi ý đồ thị</div>
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
                  <span className="text-xs text-[#64748B]">{item.fullName || item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Header Navigation & User Profile */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin"
            className="h-8 px-3 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-xs font-medium text-[#475569] hover:text-[#0F172A] flex items-center gap-1.5 transition-colors"
            title="Đến trang Quản trị viên"
          >
            <Shield className="h-3.5 w-3.5 text-[#2563EB]" />
            <span className="hidden sm:inline">Trang Quản trị</span>
          </Link>

          <div className="flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
            <img
              src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=analyst`}
              alt="Avatar"
              className="w-7 h-7 rounded-full bg-slate-100 ring-1 ring-[#E2E8F0]"
            />
            <div className="hidden lg:block text-left text-xs leading-tight">
              <div className="font-semibold text-[#0F172A] truncate max-w-[100px]">{currentUser?.fullName || 'Nhà phân tích'}</div>
              <div className="text-xs text-[#64748B]">@{currentUser?.username || 'analyst'}</div>
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
                <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B] px-3 mb-1.5 flex items-center justify-between">
                  <span>Chức năng phân tích</span>
                  <span className="text-xs font-normal text-slate-400">Phím 1-5</span>
                </div>
              )}

              {[
                { id: 'overview', name: 'Tổng quan hệ thống', icon: LayoutDashboard, shortcut: '1' },
                { id: 'explore', name: 'Khám phá đồ thị', icon: Compass, shortcut: '2' },
                { id: 'pagerank', name: 'KOLs & PageRank', icon: Award, shortcut: '3' },
                { id: 'communities', name: 'Bản đồ Cộng đồng', icon: Layers, shortcut: '4' },
                { id: 'shortest_path', name: 'Đường đi ngắn nhất', icon: RouteIcon, shortcut: '5' },
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all duration-150 ${
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
                      <kbd className="text-xs font-semibold px-2 py-0.5 rounded border border-[#CBD5E1] bg-[#F1F5F9] text-[#475569] shadow-2xs">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 2. Khối Bộ Lọc Sidebar */}
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
                    className="text-xs text-[#64748B] hover:text-[#2563EB] hover:underline"
                  >
                    Đặt lại
                  </button>
                </div>

                {/* Tìm nhanh ID người dùng / chủ đề trong sidebar */}
                <div className="space-y-1.5 bg-[#F8FAFC] p-2.5 rounded-[10px] border border-[#E2E8F0]/70 relative">
                  <label className="text-xs font-medium text-[#475569] block">
                    Tìm nhanh ID người dùng / chủ đề
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
                    <input
                      type="text"
                      value={sidebarSearchQuery}
                      onChange={(e) => handleSidebarSearchChange(e.target.value)}
                      placeholder="Gõ @user hoặc #topic..."
                      className="w-full h-8 pl-8 pr-2 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  {sidebarSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-[8px] shadow-lg p-1 z-30 space-y-0.5">
                      {sidebarSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            handleFocusNode(item.label);
                            setSidebarSuggestions([]);
                            setSidebarSearchQuery('');
                          }}
                          className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-[#F1F5F9] flex items-center justify-between"
                        >
                          <span className="font-medium text-[#0F172A]">{item.label}</span>
                          <span className="text-xs text-[#64748B]">{item.fullName || item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chip Loại Đỉnh (Node) */}
                <div className="space-y-1.5 bg-[#F8FAFC] p-2.5 rounded-[10px] border border-[#E2E8F0]/70">
                  <label className="text-xs font-medium text-[#475569] block">Loại Đỉnh (Node)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'User', label: 'Người dùng (User)', color: '#2563EB', bgActive: 'bg-[#EFF6FF]', borderActive: 'border-[#2563EB]', textActive: 'text-[#1E40AF]' },
                      { key: 'Post', label: 'Bài viết (Post)', color: '#F97316', bgActive: 'bg-[#FFF7ED]', borderActive: 'border-[#F97316]', textActive: 'text-[#C2410C]' },
                      { key: 'Topic', label: 'Chủ đề (Topic)', color: '#8B5CF6', bgActive: 'bg-[#F5F3FF]', borderActive: 'border-[#8B5CF6]', textActive: 'text-[#6D28D9]' },
                    ].map((item) => {
                      const isSelected = !!nodeTypeFilters[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() =>
                            setNodeTypeFilters((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                          }
                          className={`px-2.5 py-1.5 rounded-[8px] text-xs font-medium flex items-center gap-1.5 transition-all border ${
                            isSelected
                              ? `${item.bgActive} ${item.borderActive} ${item.textActive} shadow-xs`
                              : 'bg-white border-[#E2E8F0] text-[#94A3B8] hover:border-slate-300'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-3 w-3 shrink-0 stroke-[2.5]" style={{ color: item.color }} />
                          ) : (
                            <span className="w-2 h-2 rounded-full opacity-40 shrink-0" style={{ backgroundColor: item.color }} />
                          )}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Danh sách 7 loại Quan hệ (Cạnh) */}
                <div className="space-y-1.5 bg-[#F8FAFC] p-2.5 rounded-[10px] border border-[#E2E8F0]/70">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#475569] block">Loại Cạnh (7 Quan hệ)</label>
                    <span className="text-xs text-[#64748B]">
                      {Object.values(relTypeFilters).filter(Boolean).length}/7
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                    {ALL_REL_TYPES.map((rel) => {
                      const isChecked = !!relTypeFilters[rel.key];
                      return (
                        <button
                          key={rel.key}
                          type="button"
                          aria-pressed={isChecked}
                          onClick={() =>
                            setRelTypeFilters((prev) => ({ ...prev, [rel.key]: !prev[rel.key] }))
                          }
                          className={`w-full flex items-center justify-between p-1.5 rounded-[8px] text-xs transition-all border ${
                            isChecked
                              ? 'bg-white border-[#CBD5E1] text-[#0F172A] shadow-2xs'
                              : 'bg-[#F8FAFC] border-transparent text-[#94A3B8] opacity-65'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                                isChecked
                                  ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                  : 'border-[#CBD5E1] bg-white'
                              }`}
                            >
                              {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </span>
                            <span className="font-medium text-[#1E293B]">
                              {rel.vi} ({rel.en})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#64748B] tabular-nums font-mono">
                              {formatNumberVi(rel.count)}
                            </span>
                            <svg width="22" height="6" className="shrink-0">
                              <line
                                x1="0"
                                y1="3"
                                x2="22"
                                y2="3"
                                stroke={rel.color}
                                strokeWidth="2"
                                strokeDasharray={rel.style === 'dashed' ? '4 3' : 'none'}
                              />
                            </svg>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Khoảng Thời Gian */}
                <div className="space-y-1.5 bg-[#F8FAFC] p-2.5 rounded-[10px] border border-[#E2E8F0]/70">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#475569] flex items-center gap-1">
                      <span>Khoảng thời gian</span>
                      <span
                        className="cursor-help text-[#64748B]"
                        title="Bộ lọc thời gian áp dụng cho thống kê tương tác theo chủ đề, bài viết mới và tần suất hoạt động."
                      >
                        <Info className="h-3.5 w-3.5" />
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    {[
                      { id: '7d', label: '7 ngày' },
                      { id: '30d', label: '30 ngày' },
                      { id: '90d', label: '90 ngày' },
                      { id: 'custom', label: 'Tùy chỉnh' },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setTimePreset(preset.id)}
                        className={`py-1.5 rounded-[6px] text-center text-xs font-medium transition-colors ${
                          timePreset === preset.id
                            ? 'bg-[#2563EB] text-white shadow-2xs'
                            : 'bg-white text-[#475569] border border-[#E2E8F0] hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {timePreset === 'custom' && (
                    <div className="pt-2 space-y-1.5 animate-in fade-in duration-100">
                      <div>
                        <label className="text-xs text-[#64748B] block mb-0.5">Từ ngày</label>
                        <input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                          className="w-full text-xs p-1.5 bg-white border border-[#CBD5E1] rounded-[6px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#64748B] block mb-0.5">Đến ngày</label>
                        <input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                          className="w-full text-xs p-1.5 bg-white border border-[#CBD5E1] rounded-[6px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Nút Áp dụng bộ lọc */}
                <button
                  type="button"
                  onClick={() => {
                    showToast('Đã áp dụng các tiêu chí bộ lọc đồ thị');
                    if (activeMenu !== 'overview' && cyRef.current) {
                      cyRef.current.fit(40);
                    }
                  }}
                  className="w-full h-8 px-3 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Áp dụng bộ lọc</span>
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-white text-xs font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Nút thu gọn / mở rộng Sidebar Trái */}
          <div className="p-2 border-t border-[#E2E8F0] flex items-center justify-between">
            {!isLeftCollapsed && (
              <span className="text-xs text-[#64748B] pl-2">Thu gọn menu</span>
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
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activeMenu === 'overview'
                    ? 'bg-[#2563EB]'
                    : activeMenu === 'explore'
                    ? 'bg-[#10B981]'
                    : activeMenu === 'pagerank'
                    ? 'bg-[#F59E0B]'
                    : activeMenu === 'communities'
                    ? 'bg-[#8B5CF6]'
                    : 'bg-[#EC4899]'
                }`}
              />
              <h1 className="text-sm font-semibold text-[#0F172A]">
                {activeMenu === 'overview' && 'Tổng quan hệ thống'}
                {activeMenu === 'explore' && 'Khám phá cấu trúc đồ thị'}
                {activeMenu === 'pagerank' && 'Xếp hạng ảnh hưởng & PageRank'}
                {activeMenu === 'communities' && 'Bản đồ Phân cụm Cộng đồng'}
                {activeMenu === 'shortest_path' && 'Tìm đường đi ngắn nhất'}
              </h1>
              {activeMenu !== 'overview' && (
                <span className="text-xs text-[#64748B] hidden md:inline">
                  • Đang hiển thị {graphData.nodes.length} đỉnh, {graphData.edges.length} cạnh
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
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

              {/* Toggle Right Panel (Alt+R hoặc phím ]) */}
              <button
                type="button"
                onClick={toggleRightVisible}
                aria-label="Tùy chỉnh hiển thị cột thuộc tính và thông tin bổ trợ"
                className={`p-1.5 rounded-lg border border-[#E2E8F0] transition-colors ${
                  isRightVisible ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-white text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Ẩn/hiện cột phải (Phím tắt: ])"
              >
                <Sliders className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Dải Breadcrumbs và Trạng thái Bộ Lọc Đang Bật */}
          <div className="px-4 py-2 bg-white/80 backdrop-blur-xs border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0 text-xs">
            <div className="flex items-center gap-2 text-[#475569] flex-wrap">
              <span className="text-[#64748B]">Phân tích đồ thị</span>
              <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
              <span className="font-semibold text-[#0F172A]">
                {activeMenu === 'overview'
                  ? 'Tổng quan hệ thống'
                  : activeMenu === 'explore'
                  ? 'Khám phá cấu trúc'
                  : activeMenu === 'pagerank'
                  ? 'KOLs & PageRank'
                  : activeMenu === 'communities'
                  ? 'Phân cụm cộng đồng'
                  : 'Đường đi ngắn nhất'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[#64748B]">Bộ lọc:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.entries(nodeTypeFilters)
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] text-xs font-medium"
                    >
                      {k === 'User' ? 'Người dùng' : k === 'Post' ? 'Bài viết' : 'Chủ đề'}
                    </span>
                  ))}
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#475569] border border-slate-200 text-xs font-medium">
                  {timePreset === '7d'
                    ? '7 ngày'
                    : timePreset === '30d'
                    ? '30 ngày'
                    : timePreset === '90d'
                    ? '90 ngày'
                    : 'Tùy chỉnh'}
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: TỔNG QUAN HỆ THỐNG                                */}
          {/* ======================================================== */}
          {activeMenu === 'overview' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Thẻ Thống Kê Tổng Quan */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Tổng Đỉnh */}
                <div className="bg-white p-4 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-1">
                  <div className="text-xs text-[#64748B] font-medium flex items-center justify-between">
                    <span>Tổng Đỉnh (Nodes)</span>
                    <Users className="h-4 w-4 text-[#2563EB]" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-[#0F172A]">
                    {formatNumberVi(totalNodes)}
                  </div>
                  <div className="text-xs text-[#64748B]">10.000 người dùng • 30.000 bài viết • 50 chủ đề</div>
                </div>

                {/* 2. Tổng Cạnh */}
                <div className="bg-white p-4 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-1">
                  <div className="text-xs text-[#64748B] font-medium flex items-center justify-between">
                    <span>Tổng Cạnh (Edges)</span>
                    <Share2 className="h-4 w-4 text-[#F97316]" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-[#0F172A]">
                    {formatNumberVi(totalEdges)}
                  </div>
                  <div className="text-xs text-emerald-600 font-medium">+15,2% so với 30 ngày trước</div>
                </div>

                {/* 3. Bậc Trung Bình */}
                <div className="bg-white p-4 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-1">
                  <div className="text-xs text-[#64748B] font-medium flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span>Bậc trung bình</span>
                      <span
                        className="cursor-help text-[#64748B] hover:text-[#2563EB]"
                        title={`Công thức bậc trung bình: E / V = ${formatNumberVi(totalEdges)} / ${formatNumberVi(totalNodes)} ≈ ${formatDecimalVi(avgDegreeDirected, 1)} cạnh/đỉnh (đồ thị có hướng). Nếu coi vô hướng: 2E / V ≈ ${formatDecimalVi(avgDegreeUndirected, 1)} cạnh/đỉnh.`}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <Activity className="h-4 w-4 text-[#10B981]" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-[#0F172A]">
                    {formatDecimalVi(avgDegreeDirected, 1)} cạnh
                  </div>
                  <div
                    className="text-xs text-[#64748B] cursor-help"
                    title={`Mật độ mạng (Density) = E / (V * (V - 1)) = ${formatNumberVi(totalEdges)} / (${formatNumberVi(totalNodes)} * ${formatNumberVi(totalNodes - 1)}) ≈ ${formatDecimalVi(networkDensity, 3)}%`}
                  >
                    Mật độ: {formatDecimalVi(networkDensity, 3)}%
                  </div>
                </div>

                {/* 4. Độ Trễ Cypher */}
                <div className="bg-white p-4 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-1">
                  <div className="text-xs text-[#64748B] font-medium flex items-center justify-between">
                    <span>Độ trễ Cypher (P95)</span>
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-[#0F172A]">
                    14,2 ms
                  </div>
                  <div className="text-xs text-[#64748B]">P50: 6,1 ms so với 30 ngày trước</div>
                </div>
              </div>

              {/* Biểu đồ cột Tương tác theo Chủ đề */}
              <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">
                      Tương tác theo Chủ đề thảo luận
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      So sánh lượt Thích (Like), Bình luận (Comment) và Chia sẻ (Share) trên các chủ đề hàng đầu
                    </p>
                  </div>

                  {/* Tabs chọn thước đo */}
                  <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg text-xs self-start sm:self-auto">
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'likes', label: 'Chỉ Like' },
                      { id: 'comments', label: 'Chỉ Comment' },
                      { id: 'shares', label: 'Chỉ Chia sẻ' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setChartMetric(tab.id)}
                        className={`px-2.5 py-1 rounded-[6px] font-medium transition-all ${
                          chartMetric === tab.id
                            ? 'bg-[#2563EB] text-white shadow-xs'
                            : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-200/60'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Legend rõ ràng phía trên biểu đồ */}
                <div className="flex items-center gap-4 text-xs font-medium text-[#475569] pt-1 border-t border-[#F1F5F9]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#0EA5E9]" />
                    <span>Thích (Like)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#F59E0B]" />
                    <span>Bình luận (Comment)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#8B5CF6]" />
                    <span>Chia sẻ (Share)</span>
                  </div>
                </div>

                {/* Biểu đồ Recharts */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="displayName" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickFormatter={(val) => formatNumberVi(val)}
                        label={{
                          value: 'Số lượt',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fill: '#64748B', fontSize: 12, textAnchor: 'middle' },
                          offset: 0,
                        }}
                      />
                      <RechartsTooltip
                        formatter={(value, name) => [formatNumberVi(value), name]}
                        labelFormatter={(label) => `Chủ đề: #${label}`}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          padding: '8px 12px',
                        }}
                      />
                      {(chartMetric === 'all' || chartMetric === 'likes') && (
                        <Bar dataKey="likes" name="Thích (Like)" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                      )}
                      {(chartMetric === 'all' || chartMetric === 'comments') && (
                        <Bar dataKey="comments" name="Bình luận (Comment)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      )}
                      {(chartMetric === 'all' || chartMetric === 'shares') && (
                        <Bar dataKey="shares" name="Chia sẻ (Share)" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Biểu đồ phân phối bậc (Power Law) */}
              <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A]">
                    Phân phối bậc đồ thị (luật lũy thừa)
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Đa số đỉnh có bậc liên kết thấp; số ít đỉnh trung tâm nắm giữ hàng nghìn liên kết theo mô hình mạng không tỷ lệ (Scale-Free).
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
                      margin={{ top: 10, right: 15, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickFormatter={(val) => formatNumberVi(val)}
                        label={{
                          value: 'Số đỉnh',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fill: '#64748B', fontSize: 12, textAnchor: 'middle' },
                          offset: 0,
                        }}
                      />
                      <RechartsTooltip
                        formatter={(val) => [formatNumberVi(val), 'Số đỉnh']}
                        labelFormatter={(label) => `Bậc: ${label}`}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" name="Số lượng Đỉnh" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TABS 2-5: KHÔNG GIAN ĐỒ THỊ CYTOSCAPE                    */}
          {/* ======================================================== */}
          {activeMenu !== 'overview' && (
            <div className={`flex-1 relative overflow-hidden transition-colors ${isDarkCanvas ? 'bg-[#0B1220]' : 'bg-[#F8FAFC]'}`}>
              {/* Toolbar Tab Khám Phá */}
              {activeMenu === 'explore' && (
                <div className="absolute top-3 left-4 right-4 z-20 max-w-xl mx-auto bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-[10px] p-2 shadow-sm flex items-center gap-2">
                  <Compass className="h-4 w-4 text-[#10B981] shrink-0" />
                  <input
                    type="text"
                    placeholder="Đặt tâm điểm khảo sát (vd: @alice, @admin, #api)..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        handleFocusNode(e.target.value.trim());
                      }
                    }}
                    className="flex-1 h-7 bg-slate-50 border border-[#E2E8F0] rounded px-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                  <span className="text-xs text-[#64748B] shrink-0">Nhấn Enter để định vị</span>
                </div>
              )}

              {/* Toolbar Tab KOLs & PageRank */}
              {activeMenu === 'pagerank' && (
                <div className="absolute top-3 left-4 right-4 z-20 max-w-2xl mx-auto bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-[10px] p-2.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-[#F59E0B]" />
                      <span className="font-semibold text-[#0F172A]">Chế độ Quyền lực PageRank</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Top 5 có hào quang vàng
                      </span>
                    </div>
                    <span className="text-xs text-[#64748B]">Bấm vào KOL để focus mạng lưới</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {kolsList.slice(0, 4).map((kol) => (
                      <button
                        key={kol.id}
                        type="button"
                        onClick={() => handleFocusNode(kol.username)}
                        className="px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold flex items-center justify-center">
                          {kol.rank}
                        </span>
                        <span>@{kol.username}</span>
                        <span className="text-xs text-amber-700">({formatDecimalVi(kol.pagerank * 100, 1)}%)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toolbar Tab Bản Đồ Cộng Đồng */}
              {activeMenu === 'communities' && (
                <div className="absolute top-3 left-4 right-4 z-20 max-w-2xl mx-auto bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-[10px] p-2.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#8B5CF6]" />
                      <span className="font-semibold text-[#0F172A]">Bộ lọc Cụm Cộng đồng</span>
                    </div>
                    {activeCommunityHighlight && (
                      <button
                        type="button"
                        onClick={() => handleHighlightCommunity(activeCommunityHighlight)}
                        className="text-xs text-[#64748B] hover:text-[#2563EB]"
                      >
                        Hiển thị tất cả cụm
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {communitiesList.slice(0, 6).map((c) => {
                      const cid = String(c.id);
                      const isSelected = activeCommunityHighlight === cid;
                      const color = COMMUNITY_COLORS[(Number(c.id) - 1) % COMMUNITY_COLORS.length];
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleHighlightCommunity(cid)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'ring-2 ring-black text-white shadow-xs'
                              : 'bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A]'
                          }`}
                          style={{ backgroundColor: isSelected ? color : undefined }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span>Cụm #{c.id}</span>
                          <span className={`text-xs ${isSelected ? 'text-white/90' : 'text-[#64748B]'}`}>
                            ({formatNumberVi(c.size)} TV)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toolbar Tab Đường Đi Ngắn Nhất */}
              {activeMenu === 'shortest_path' && (
                <div className="absolute top-3 left-4 right-4 z-20 max-w-2xl mx-auto bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-[12px] p-3 shadow-lg space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RouteIcon className="h-4 w-4 text-[#EC4899]" />
                      <span className="text-xs font-semibold text-[#0F172A]">Tìm đường đi ngắn nhất giữa hai người dùng</span>
                    </div>
                    {pathResult && (
                      <button
                        type="button"
                        onClick={handleClearPath}
                        className="text-xs text-[#64748B] hover:text-red-600 hover:underline"
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
                  onClick={() => cyRef.current?.fit(60)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A]"
                  title="Vừa màn hình (Fit)"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <div className="h-px bg-[#E2E8F0] my-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    const nextLayout = graphLayout === 'cose' ? 'concentric' : graphLayout === 'concentric' ? 'circle' : 'cose';
                    setGraphLayout(nextLayout);
                    showToast(`Bố cục đồ thị: ${nextLayout === 'cose' ? 'Lực liên kết (Cose)' : nextLayout === 'concentric' ? 'Đồng tâm theo bậc (Concentric)' : 'Vòng tròn (Circle)'}`);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A]"
                  title={`Đổi kiểu bố cục (hiện tại: ${graphLayout === 'cose' ? 'Lực liên kết' : graphLayout === 'concentric' ? 'Đồng tâm' : 'Vòng tròn'})`}
                >
                  <Layers className="h-4 w-4" />
                </button>
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
                <div className="font-semibold text-[#0F172A] text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Hình dạng & Màu sắc</span>
                  <span className="text-xs text-slate-400 font-normal">Kích thước ~ PageRank</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <span className="text-xs text-[#475569]">User (Tròn)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded bg-[#F97316]" />
                    <span className="text-xs text-[#475569]">Post (Hộp)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rotate-45 bg-[#8B5CF6]" />
                    <span className="text-xs text-[#475569]">Topic (Thoi)</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-[#E2E8F0]/70">
                  <div className="text-xs text-[#64748B] mb-1">Cộng đồng (Bấm để làm nổi):</div>
                  <div className="flex flex-wrap gap-1">
                    {COMMUNITY_COLORS.map((color, idx) => {
                      const cid = String(idx + 1);
                      const isHighlighted = activeCommunityHighlight === cid;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => handleHighlightCommunity(cid)}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-transform ${
                            isHighlighted ? 'scale-125 ring-2 ring-black' : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Cộng đồng #${cid}`}
                        >
                          {cid}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Banner Chỉ Số Hiệu Năng Đồ Thị */}
              <div className="absolute bottom-4 right-4 z-10 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs border border-[#E2E8F0] shadow-xs text-xs text-[#64748B] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Hiển thị {graphData.nodes.length} đỉnh thực tế từ FalkorDB</span>
              </div>
            </div>
          )}
        </main>

        {/* ------------------------------------------------------ */}
        {/* CỘT PHẢI: BỔ SUNG CỘT PHẢI THEO THIẾT KẾ (340PX)        */}
        {/* ------------------------------------------------------ */}
        {isRightVisible && (
          <aside className="w-[340px] bg-white border-l border-[#E2E8F0] shrink-0 flex flex-col justify-between overflow-y-auto p-4 space-y-4 z-20 animate-in fade-in duration-150">
            <div className="space-y-4">
              {/* WIDGET 1: PHÂN BỐ LOẠI QUAN HỆ */}
              <div className="bg-white rounded-[10px] border border-[#E2E8F0] overflow-hidden">
                <div
                  onClick={() => toggleWidget('relTypes')}
                  className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border-b border-[#E2E8F0] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-[#2563EB]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                      PHÂN BỐ LOẠI QUAN HỆ
                    </span>
                  </div>
                  <button type="button" className="text-[#64748B]">
                    {collapsedWidgets.relTypes ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!collapsedWidgets.relTypes && (
                  <div className="p-3 space-y-3">
                    <div className="space-y-2 text-xs">
                      {ALL_REL_TYPES.map((item) => {
                        const pctNum = (item.count / totalEdges) * 100;
                        const pct = formatPctVi(pctNum, 1);
                        const progressWidth = `${Math.min(100, Math.round((item.count / maxRelCount) * 100))}%`;

                        return (
                          <div key={item.key} className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-[#0F172A]">{item.vi} ({item.en})</span>
                              <span className="font-semibold tabular-nums text-[#2563EB]">{pct}</span>
                            </div>
                            <div className="w-full h-[6px] bg-[#F1F5F9] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ backgroundColor: item.color, width: progressWidth }}
                              />
                            </div>
                            <div className="text-xs text-[#64748B]">
                              {formatNumberVi(item.count)} liên kết
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Khung Ý nghĩa phân tích vĩ mô (Sinh động từ dữ liệu thật) */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-[10px] text-xs text-blue-900 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-[#2563EB]" />
                        <span>Ý nghĩa phân tích vĩ mô</span>
                      </div>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        {macroAnalysisText}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* WIDGET 2: TOP 5 INFLUENCER */}
              <div className="bg-white rounded-[10px] border border-[#E2E8F0] overflow-hidden">
                <div
                  onClick={() => toggleWidget('influencers')}
                  className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border-b border-[#E2E8F0] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-[#F59E0B]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                      TOP 5 INFLUENCER
                    </span>
                  </div>
                  <button type="button" className="text-[#64748B]">
                    {collapsedWidgets.influencers ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!collapsedWidgets.influencers && (
                  <div className="p-3 space-y-2">
                    {kolsList.slice(0, 5).map((kol) => (
                      <div
                        key={kol.id}
                        onClick={() => handleFocusNode(kol.username)}
                        className="p-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-amber-50/40 cursor-pointer flex items-center justify-between transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              kol.rank === 1
                                ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-500'
                                : kol.rank === 2
                                ? 'bg-slate-300 text-slate-800'
                                : kol.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 text-[#64748B]'
                            }`}
                          >
                            {kol.rank}
                          </span>
                          <img
                            src={kol.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${kol.username}`}
                            alt={kol.username}
                            className="w-6 h-6 rounded-full bg-slate-100 shrink-0"
                          />
                          <div className="min-w-0 truncate">
                            <div className="font-semibold text-[#0F172A] truncate">@{kol.username}</div>
                            <div className="text-xs text-[#64748B] truncate">{kol.fullName}</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-semibold text-[#2563EB] tabular-nums text-xs">
                            PR: {formatDecimalVi(kol.pagerank * 100, 2)}%
                          </div>
                          <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden ml-auto">
                            <div
                              className="h-full bg-[#2563EB] rounded-full"
                              style={{ width: `${Math.min(100, kol.pagerank * 300)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* WIDGET 3: CHỦ ĐỀ HOT (TOP 5) */}
              <div className="bg-white rounded-[10px] border border-[#E2E8F0] overflow-hidden">
                <div
                  onClick={() => toggleWidget('hotTopics')}
                  className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border-b border-[#E2E8F0] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-[#F97316]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                      CHỦ ĐỀ HOT (TOP 5)
                    </span>
                  </div>
                  <button type="button" className="text-[#64748B]">
                    {collapsedWidgets.hotTopics ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!collapsedWidgets.hotTopics && (
                  <div className="p-3 space-y-2">
                    {chartData.slice(0, 5).map((topic, idx) => {
                      const maxInteractions = chartData[0]?.interactions || 1;
                      const progressWidth = `${Math.round((topic.interactions / maxInteractions) * 100)}%`;

                      return (
                        <div key={topic.name} className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-slate-100 text-[#475569] font-bold text-[10px] flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-[#0F172A]">#{topic.displayName}</span>
                            </div>
                            <span className="text-xs text-[#2563EB] font-medium tabular-nums">
                              {formatNumberVi(topic.interactions)} tương tác
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#F97316] rounded-full" style={{ width: progressWidth }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* WIDGET 4: CHI TIẾT THỰC THỂ */}
              <div className="bg-white rounded-[10px] border border-[#E2E8F0] overflow-hidden">
                <div
                  onClick={() => toggleWidget('entityDetail')}
                  className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border-b border-[#E2E8F0] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="h-4 w-4 text-[#10B981]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                      CHI TIẾT THỰC THỂ
                    </span>
                  </div>
                  <button type="button" className="text-[#64748B]">
                    {collapsedWidgets.entityDetail ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!collapsedWidgets.entityDetail && (
                  <div className="p-3">
                    {!selectedNode ? (
                      <div className="p-5 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-[10px] text-center space-y-1.5">
                        <CircleDot className="h-5 w-5 text-[#94A3B8] mx-auto" />
                        <div className="text-xs font-medium text-[#475569]">
                          Chọn một đỉnh trên đồ thị để xem chi tiết
                        </div>
                        <p className="text-xs text-[#64748B]">
                          Nhấp vào bất kỳ người dùng, bài viết hoặc chủ đề để kiểm tra các thuộc tính kết nối.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center font-bold text-[#2563EB] text-sm shrink-0">
                            {selectedNode.username?.charAt(0).toUpperCase() || selectedNode.type?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs text-[#0F172A] truncate">
                              {selectedNode.fullName || selectedNode.label}
                            </div>
                            <div className="text-xs text-[#64748B] truncate">
                              ID: {selectedNode.id}
                            </div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#F1F5F9] text-[#475569]">
                            {selectedNode.type}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          {selectedNode.content && (
                            <div className="p-2 bg-slate-50 rounded border border-[#E2E8F0] text-xs text-[#334155]">
                              "{selectedNode.content}"
                            </div>
                          )}
                          {selectedNode.followers !== undefined && (
                            <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9]">
                              <span className="text-[#64748B]">Người theo dõi:</span>
                              <span className="font-semibold text-[#0F172A] tabular-nums">
                                {formatNumberVi(selectedNode.followers)}
                              </span>
                            </div>
                          )}
                          {selectedNode.pagerank !== undefined && (
                            <div className="py-1 border-b border-[#F1F5F9] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[#64748B]">PageRank:</span>
                                <span className="font-semibold text-[#2563EB] tabular-nums">
                                  {formatPctVi(selectedNode.pagerank * 100, 2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleExpandNeighborhood(selectedNode.id)}
                            className="h-7 px-2 bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1] rounded-[8px] text-xs font-medium text-[#334155] flex items-center justify-center gap-1 transition-colors"
                          >
                            <Sparkles className="h-3 w-3 text-[#2563EB]" />
                            <span>Mở rộng 1-hop</span>
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
                            className="h-7 px-2 bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1] rounded-[8px] text-xs font-medium text-[#334155] flex items-center justify-center gap-1 transition-colors"
                          >
                            <RouteIcon className="h-3 w-3 text-[#F97316]" />
                            <span>Đặt điểm A</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                    if (item.id === 'overview') setViewMode('analytics');
                    else setViewMode('graph');
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
