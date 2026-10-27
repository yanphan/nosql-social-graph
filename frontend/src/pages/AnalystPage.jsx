import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Menu,
  Workflow,
  Copy,
  Layers,
  AlertTriangle,
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

// Hàm lấy màu cộng đồng an toàn tránh undefined khi id = 0 hoặc âm
export const getSafeCommunityColor = (id) => {
  const num = Number(id);
  if (isNaN(num)) return COMMUNITY_COLORS[0];
  const idx = ((num % COMMUNITY_COLORS.length) + COMMUNITY_COLORS.length) % COMMUNITY_COLORS.length;
  return COMMUNITY_COLORS[idx];
};

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

// Chuẩn hóa tên Topic
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

// Xây dựng Cytoscape Stylesheet độc lập
export function buildCytoscapeStyle(isDark, activeMenu) {
  const isCommunityMode = activeMenu === 'communities';

  return [
    // Base node style
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        'font-family': 'Inter, system-ui, -apple-system, sans-serif',
        'font-size': '11px',
        'font-weight': 500,
        color: isDark ? '#E2E8F0' : '#1E293B',
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'text-background-opacity': isDark ? 0.8 : 0.85,
        'text-background-color': isDark ? '#0B1220' : '#FFFFFF',
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
        'min-zoomed-font-size': 9,
        width: (ele) => {
          const type = ele.data('type');
          if (type === 'Topic') return 38;
          if (type === 'Post') return 32;
          const pr = Number(ele.data('pagerank') || 0.05);
          return Math.max(24, Math.min(60, Math.round(24 + pr * 100)));
        },
        height: (ele) => {
          const type = ele.data('type');
          if (type === 'Topic') return 38;
          if (type === 'Post') return 24;
          const pr = Number(ele.data('pagerank') || 0.05);
          return Math.max(24, Math.min(60, Math.round(24 + pr * 100)));
        },
        shape: (ele) => {
          const type = ele.data('type');
          if (type === 'Topic') return 'diamond';
          if (type === 'Post') return 'round-rectangle';
          return 'ellipse';
        },
        'background-color': (ele) => {
          if (isCommunityMode) {
            return ele.data('communityColor') || '#2563EB';
          }
          return NODE_TYPE_COLORS[ele.data('type')] || '#2563EB';
        },
        'border-width': 2,
        'border-color': isDark ? '#1E293B' : '#FFFFFF',
        'text-max-width': '90px',
        'text-wrap': 'ellipsis',
      },
    },
    // Topic Nodes
    {
      selector: 'node[type = "Topic"]',
      style: {
        'border-width': 3,
        'border-color': '#FFFFFF',
        'font-weight': 600,
        'font-size': '12px',
      },
    },
    // KOLs (Key Opinion Leaders) - Hào quang vàng hợp lệ (underlay-*, không dùng shadow-*)
    {
      selector: 'node.kol',
      style: {
        'border-width': 3,
        'border-color': '#F59E0B',
        'underlay-color': '#F59E0B',
        'underlay-padding': 4,
        'underlay-opacity': 0.45,
        'underlay-shape': 'ellipse',
        'font-weight': 600,
      },
    },
    // Base edge style
    {
      selector: 'edge',
      style: {
        width: 1,
        'line-color': (ele) => EDGE_COLORS[ele.data('type')] || '#94A3B8',
        'target-arrow-color': (ele) => EDGE_COLORS[ele.data('type')] || '#94A3B8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 0.7,
        opacity: isDark ? 0.45 : 0.5,
        'line-style': (ele) =>
          ele.data('type') === 'ABOUT' || ele.data('type') === 'INTERESTED_IN' ? 'dashed' : 'solid',
      },
    },
    // Hover edge effect
    {
      selector: 'edge.hovered',
      style: {
        width: 2.5,
        opacity: 1,
      },
    },
    // Selection state on node
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#2563EB',
        'underlay-color': '#2563EB',
        'underlay-padding': 6,
        'underlay-opacity': 0.5,
      },
    },
    // Neighbor nodes of selected node
    {
      selector: 'node.neighbor',
      style: {
        opacity: 1,
        'border-width': 2.5,
        'border-color': '#3B82F6',
      },
    },
    // Hidden state (Bộ lọc không relayout)
    {
      selector: '.hidden',
      style: {
        display: 'none',
      },
    },
    // Dimmed state
    {
      selector: '.dimmed',
      style: {
        opacity: 0.08,
      },
    },
    // Highlighted community nodes
    {
      selector: '.highlighted',
      style: {
        opacity: 1,
        'border-width': 3.5,
        'border-color': '#FFFFFF',
        'underlay-color': '#3B82F6',
        'underlay-padding': 5,
        'underlay-opacity': 0.6,
      },
    },
    // Shortest Path Highlighting
    {
      selector: '.path-highlighted',
      style: {
        opacity: 1,
        'border-color': '#EAB308',
        'border-width': 4,
        'line-color': '#EAB308',
        'target-arrow-color': '#EAB308',
        width: 3.5,
        'underlay-color': '#EAB308',
        'underlay-padding': 5,
        'underlay-opacity': 0.7,
      },
    },
  ];
}

export default function AnalystPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => authService.getStoredUser());

  // Navigation: 'overview' | 'explore' | 'pagerank' | 'communities' | 'shortest_path'
  const [activeMenu, setActiveMenu] = useState('explore');
  const [viewMode, setViewMode] = useState('graph');

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

  // Layout Engine: 'fcose' | 'concentric' | 'circle' | 'grid'
  const [graphLayout, setGraphLayout] = useState('fcose');
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Loading, Errors & Notifications
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Data States
  const [stats, setStats] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [kolsList, setKolsList] = useState([]);
  const [communitiesList, setCommunitiesList] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);

  // Single Source of Truth for Graph Selections
  const [selectedId, setSelectedId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [communityHighlight, setCommunityHighlight] = useState(null);
  const [pathResult, setPathResult] = useState(null);

  // Counts of elements currently visible vs loaded
  const [visibleCounts, setVisibleCounts] = useState({
    visibleNodes: 0,
    totalNodes: 0,
    visibleEdges: 0,
    totalEdges: 0,
  });

  // Tooltip floating on node hover
  const [hoveredNode, setHoveredNode] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Filters State (Applied immediately without rebuild)
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

  // Search Inputs & Autocomplete States
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [headerSuggestions, setHeaderSuggestions] = useState([]);
  const [headerActiveIdx, setHeaderActiveIdx] = useState(-1);

  const [centerSearchQuery, setCenterSearchQuery] = useState('');
  const [centerSuggestions, setCenterSuggestions] = useState([]);
  const [centerActiveIdx, setCenterActiveIdx] = useState(-1);

  // Shortest Path Tool State
  const [pathSource, setPathSource] = useState('alice');
  const [pathTarget, setPathTarget] = useState('david');
  const [pathMaxDepth, setPathMaxDepth] = useState(6);
  const [isPathSearching, setIsPathSearching] = useState(false);

  // Chart Interactive Filters
  const [chartMetric, setChartMetric] = useState('all');

  // Accordion widgets collapse states
  const [sidebarAccordions, setSidebarAccordions] = useState({
    nodeTypes: true,
    relTypes: true,
    time: true,
  });

  const toggleSidebarAccordion = (key) => {
    setSidebarAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [isLegendCollapsed, setIsLegendCollapsed] = useState(true);

  const [collapsedWidgets, setCollapsedWidgets] = useState({
    entityDetail: false,
    relTypes: false,
    influencers: false,
    hotTopics: false,
  });

  const toggleWidget = (key) => {
    setCollapsedWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Refs
  const cyContainerRef = useRef(null);
  const cyRef = useRef(null);
  const canvasWrapperRef = useRef(null);
  const headerSearchInputRef = useRef(null);
  const centerSearchInputRef = useRef(null);
  const searchAbortControllerRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  // Toast Notification
  const showToast = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Phím tắt toàn cục: 1-5 chuyển chức năng, ] ẩn/hiện cột phải, Ctrl+K / Cmd+K focus tìm kiếm, Esc xóa chọn
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K hoặc Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        headerSearchInputRef.current?.focus();
        headerSearchInputRef.current?.select();
        return;
      }

      // Khi đang gõ trong input text
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          setHeaderSuggestions([]);
          setCenterSuggestions([]);
          e.target.blur();
        }
        return;
      }

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
        // Esc xóa vùng chọn, làm mờ, community highlight và path-highlight (giữ ô A/B)
        handleDeselectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Tải toàn bộ dữ liệu ban đầu
  useEffect(() => {
    loadInitialData();
  }, [timePreset, dateRange]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      await analyticsApi.ensureAnalystAuth();
      const stored = authService.getStoredUser();
      if (stored) setCurrentUser(stored);
      const [sData, gData, kData, cData, tData] = await Promise.all([
        analyticsApi.getStats(),
        analyticsApi.getSubgraph({
          limit: 120,
          from: timePreset === 'custom' ? dateRange.from : undefined,
          to: timePreset === 'custom' ? dateRange.to : undefined,
        }),
        analyticsApi.getInfluence({ metric: 'pagerank', limit: 10 }),
        analyticsApi.getCommunities(),
        analyticsApi.getTrendingTopics({ days: timePreset === '7d' ? 7 : timePreset === '90d' ? 90 : 30, limit: 8 }),
      ]);

      setStats(sData);
      setGraphData(gData);
      setKolsList(kData);
      setCommunitiesList(cData.communities || []);
      setTrendingTopics(tData);
      setIsOffline(!!gData.isOffline);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Không thể kết nối đến backend FalkorDB. Đang chuyển sang dữ liệu ngoại tuyến dự phòng.');
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  // 3. Khởi tạo Cytoscape một lần duy nhất
  useEffect(() => {
    if (!cyContainerRef.current) return;

    const cy = cytoscape({
      container: cyContainerRef.current,
      elements: [],
      style: buildCytoscapeStyle(isDarkCanvas, activeMenu),
      minZoom: 0.15,
      maxZoom: 4,
      boxSelectionEnabled: false,
      autounselectify: false,
    });

    // Node click
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      handleSelectNode(node.data('id'), false);
    });

    // Double-click on node -> Mở rộng 1-hop
    cy.on('dbltap', 'node', (evt) => {
      const node = evt.target;
      const d = node.data();
      handleExpandNeighborhood(d.username || d.id);
    });

    // Click canvas background -> Bỏ chọn
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        handleDeselectAll();
      }
    });

    // Hover node -> Làm nổi cạnh liên quan + hiện Tooltip
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      if (!node.hasClass('hidden')) {
        const renderedPos = node.renderedPosition();
        setHoveredNode({
          data: node.data(),
          x: renderedPos.x,
          y: renderedPos.y,
        });
        node.connectedEdges().addClass('hovered');
      }
    });

    cy.on('mouseout', 'node', (evt) => {
      setHoveredNode(null);
      evt.target.connectedEdges().removeClass('hovered');
    });

    // Zoom listener: nếu zoom > 1.2, hiện nhãn đầy đủ cho tất cả node
    cy.on('zoom', () => {
      const currentZoom = cy.zoom();
      if (currentZoom > 1.2) {
        cy.nodes().addClass('zoomed-in');
      } else {
        cy.nodes().removeClass('zoomed-in');
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  // 4. ResizeObserver trên container đồ thị
  useEffect(() => {
    if (!cyContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (cyRef.current) {
        cyRef.current.resize();
      }
    });
    ro.observe(cyContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Resize khi bật/tắt cột hoặc thu gọn menu
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [isLeftCollapsed, isRightVisible]);

  // 5. Cập nhật Style khi đổi nền tối/sáng hoặc chế độ (Explore, PageRank, Communities)
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.style(buildCytoscapeStyle(isDarkCanvas, activeMenu));
      reapplySelectionStates();
    }
  }, [isDarkCanvas, activeMenu]);

  // 6. Cập nhật dữ liệu tăng dần qua cy.batch (chỉ thêm mới, không phá vỡ đồ thị)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !graphData.nodes || graphData.nodes.length === 0) return;

    const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
    const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));

    const newNodes = graphData.nodes.filter((n) => !existingNodeIds.has(n.data.id));
    const newEdges = graphData.edges.filter((e) => !existingEdgeIds.has(e.data.id));

    if (newNodes.length === 0 && newEdges.length === 0 && !isFirstLoadRef.current) {
      applyFiltersToCanvas();
      return;
    }

    cy.batch(() => {
      if (newNodes.length > 0) cy.add(newNodes);
      if (newEdges.length > 0) cy.add(newEdges);
    });

    // Đánh dấu KOLs
    const kolSet = new Set(kolsList.slice(0, 10).map((k) => k.id || `u_${k.username}` || k.username));
    cy.nodes().forEach((n) => {
      const d = n.data();
      if (d.isKOL || kolSet.has(d.id) || kolSet.has(d.username)) {
        n.addClass('kol');
      }
    });

    // Áp dụng bộ lọc hiện tại
    applyFiltersToCanvas();

    // Chạy layout
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      runCurrentLayout({ fit: true, randomize: true });
    } else if (newNodes.length > 0) {
      // Khóa node cũ, chạy layout cho node mới mà không thay đổi camera
      const oldNodes = cy.nodes().filter((n) => existingNodeIds.has(n.id()));
      oldNodes.lock();
      runCurrentLayout({ fit: false, randomize: false }, () => {
        oldNodes.unlock();
      });
    }

    reapplySelectionStates();
  }, [graphData, kolsList]);

  // 7. Áp dụng bộ lọc (ẩn/hiện tức thì qua class .hidden, không rebuild)
  const applyFiltersToCanvas = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      // 1. Lọc Node
      cy.nodes().forEach((n) => {
        const type = n.data('type');
        const isVisible = nodeTypeFilters[type] !== false;
        if (isVisible) {
          n.removeClass('hidden');
        } else {
          n.addClass('hidden');
        }
      });

      // 2. Lọc Edge: ẩn nếu loại cạnh bị tắt hoặc một trong hai đầu mút bị ẩn
      cy.edges().forEach((e) => {
        const type = e.data('type');
        const isTypeVisible = relTypeFilters[type] !== false;
        const sHidden = e.source().hasClass('hidden');
        const tHidden = e.target().hasClass('hidden');

        if (isTypeVisible && !sHidden && !tHidden) {
          e.removeClass('hidden');
        } else {
          e.addClass('hidden');
        }
      });
    });

    // Cập nhật số đếm phần tử đang hiển thị
    const vNodes = cy.nodes().not('.hidden').length;
    const tNodes = cy.nodes().length;
    const vEdges = cy.edges().not('.hidden').length;
    const tEdges = cy.edges().length;

    setVisibleCounts({
      visibleNodes: vNodes,
      totalNodes: tNodes,
      visibleEdges: vEdges,
      totalEdges: tEdges,
    });

    reapplySelectionStates();
  }, [nodeTypeFilters, relTypeFilters]);

  // Kích hoạt lọc ngay khi bộ lọc thay đổi
  useEffect(() => {
    applyFiltersToCanvas();
  }, [nodeTypeFilters, relTypeFilters, applyFiltersToCanvas]);

  // 8. Chạy Layout Cytoscape
  const runCurrentLayout = useCallback((options = {}, onFinish) => {
    const cy = cyRef.current;
    if (!cy) return;

    let layoutConfig = {
      name: 'fcose',
      quality: 'default',
      packComponents: true,
      nodeRepulsion: 6500,
      idealEdgeLength: 90,
      nodeSeparation: 80,
      animate: 'end',
      animationDuration: 500,
      randomize: options.randomize ?? false,
      fit: options.fit ?? false,
      padding: 50,
      stop: () => {
        if (onFinish) onFinish();
      },
    };

    if (graphLayout === 'concentric') {
      layoutConfig = {
        name: 'concentric',
        concentric: (node) => (node.data('pagerank') || 0.05) * 100 + node.degree(),
        levelWidth: () => 1,
        animate: true,
        animationDuration: 500,
        fit: options.fit ?? true,
        padding: 50,
        stop: () => {
          if (onFinish) onFinish();
        },
      };
    } else if (graphLayout === 'circle') {
      layoutConfig = {
        name: 'circle',
        animate: true,
        animationDuration: 500,
        fit: options.fit ?? true,
        padding: 50,
        stop: () => {
          if (onFinish) onFinish();
        },
      };
    } else if (graphLayout === 'grid') {
      layoutConfig = {
        name: 'grid',
        animate: true,
        animationDuration: 500,
        fit: options.fit ?? true,
        padding: 50,
        stop: () => {
          if (onFinish) onFinish();
        },
      };
    }

    try {
      const l = cy.layout(layoutConfig);
      l.run();
    } catch (err) {
      console.warn('Layout execution error:', err.message);
      if (onFinish) onFinish();
    }
  }, [graphLayout]);

  // Đổi layout khi người dùng chọn trong dropdown
  const handleChangeLayout = (name) => {
    setGraphLayout(name);
    setIsLayoutDropdownOpen(false);
    setTimeout(() => {
      runCurrentLayout({ fit: true, randomize: false });
      showToast(`Đã áp dụng bố cục: ${name === 'fcose' ? 'fCoSE' : name}`);
    }, 50);
  };

  // 9. Nguồn sự thật cho vùng chọn: Áp lại các class trạng thái
  const reapplySelectionStates = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass('dimmed highlighted path-highlighted neighbor');

    if (pathResult && pathResult.steps && pathResult.steps.length > 0) {
      cy.elements().addClass('dimmed');
      const stepSet = new Set(pathResult.steps);
      const pNodes = cy.nodes().filter((n) => stepSet.has(n.data('username')) || stepSet.has(n.data('id')));
      pNodes.removeClass('dimmed').addClass('path-highlighted');

      for (let i = 0; i < pathResult.steps.length - 1; i++) {
        const uA = pathResult.steps[i];
        const uB = pathResult.steps[i + 1];
        const edge = cy.edges().filter((e) => {
          const s = e.source().data('username') || e.source().id();
          const t = e.target().data('username') || e.target().id();
          return (s === uA && t === uB) || (s === uB && t === uA);
        });
        edge.removeClass('dimmed').addClass('path-highlighted');
      }
    } else if (communityHighlight) {
      cy.elements().addClass('dimmed');
      const cNodes = cy.nodes().filter((n) => String(n.data('community')) === String(communityHighlight));
      const cEdges = cNodes.connectedEdges();
      cNodes.removeClass('dimmed').addClass('highlighted');
      cEdges.removeClass('dimmed');
    } else if (selectedId) {
      const node = cy.getElementById(selectedId);
      if (node && node.length > 0) {
        cy.elements().addClass('dimmed');
        node.removeClass('dimmed');
        node.select();

        const neighborhood = node.neighborhood();
        neighborhood.removeClass('dimmed');
        neighborhood.nodes().addClass('neighbor');
      }
    }
  }, [pathResult, communityHighlight, selectedId]);

  // Hàm chọn node dùng chung cho toàn bộ giao diện
  const handleSelectNode = useCallback((nodeId, shouldCenter = true) => {
    const cy = cyRef.current;
    if (!cy || !nodeId) return;

    const node = cy.getElementById(nodeId);
    if (!node || node.length === 0) return;

    setSelectedId(nodeId);
    setSelectedNode(node.data());
    setCommunityHighlight(null);
    setPathResult(null);

    // Tự mở widget Chi tiết thực thể ở đầu cột phải
    setCollapsedWidgets((prev) => ({ ...prev, entityDetail: false }));
    setIsRightVisible(true);

    if (shouldCenter) {
      cy.animate({
        center: { eles: node },
        zoom: 1.6,
        duration: 400,
      });
    }

    reapplySelectionStates();
  }, [reapplySelectionStates]);

  // Bỏ chọn tất cả
  const handleDeselectAll = useCallback(() => {
    setSelectedId(null);
    setSelectedNode(null);
    setCommunityHighlight(null);
    setPathResult(null);
    if (cyRef.current) {
      cyRef.current.elements().removeClass('dimmed highlighted path-highlighted neighbor');
      cyRef.current.nodes().unselect();
    }
  }, []);

  // Định vị hoặc tải thêm node từ tìm kiếm
  const handleFocusOrLoadNode = async (identifier) => {
    if (!identifier) return;
    const cy = cyRef.current;
    const clean = identifier.replace(/^[@#]/, '').trim();

    // 1. Tìm trong canvas hiện có
    if (cy) {
      const target = cy.nodes().filter((n) => {
        const d = n.data();
        return d.username === clean || d.id === clean || d.name === clean || d.id === `u_${clean}` || d.id === `t_${clean}`;
      });

      if (target.length > 0) {
        handleSelectNode(target.data('id'), true);
        showToast(`Đã định vị: ${target.data('label')}`);
        return;
      }
    }

    // 2. Không có trên canvas -> Gọi API getSubgraph({ center })
    showToast(`Đang nạp đỉnh: ${clean}...`);
    try {
      const res = await analyticsApi.getSubgraph({ center: clean, hops: 1 });
      if (res && res.nodes && res.nodes.length > 0) {
        setGraphData((prev) => {
          const existingIds = new Set(prev.nodes.map((n) => n.data.id));
          const newNodes = res.nodes.filter((n) => !existingIds.has(n.data.id));
          const existingEdgeIds = new Set(prev.edges.map((e) => e.data.id));
          const newEdges = res.edges.filter((e) => !existingEdgeIds.has(e.data.id));

          return {
            nodes: [...prev.nodes, ...newNodes],
            edges: [...prev.edges, ...newEdges],
          };
        });

        // Đợi nạp xong rồi focus
        setTimeout(() => {
          const cyNew = cyRef.current;
          if (cyNew) {
            const added = cyNew.nodes().filter((n) => {
              const d = n.data();
              return d.username === clean || d.id === clean || d.name === clean || d.id === `u_${clean}` || d.id === `t_${clean}`;
            });
            if (added.length > 0) {
              handleSelectNode(added.data('id'), true);
              showToast(`Đã nạp và định vị: ${added.data('label')}`);
            }
          }
        }, 300);
      } else {
        showToast(`Không tìm thấy thực thể "${identifier}" trong hệ thống`);
      }
    } catch {
      showToast(`Lỗi khi tìm nạp thực thể "${identifier}"`);
    }
  };

  // Mở rộng láng giềng (+1 Hop)
  const handleExpandNeighborhood = async (centerId) => {
    if (!centerId) return;
    const cleanId = String(centerId).replace(/^[@#]/, '');
    showToast('Đang mở rộng lân cận (+1 Hop)...');

    try {
      const res = await analyticsApi.getSubgraph({ center: cleanId, hops: 1, limit: 40 });
      if (res && res.nodes && res.nodes.length > 0) {
        setGraphData((prev) => {
          const existingIds = new Set(prev.nodes.map((n) => n.data.id));
          const newNodes = res.nodes.filter((n) => !existingIds.has(n.data.id));
          const existingEdgeIds = new Set(prev.edges.map((e) => e.data.id));
          const newEdges = res.edges.filter((e) => !existingEdgeIds.has(e.data.id));

          return {
            nodes: [...prev.nodes, ...newNodes],
            edges: [...prev.edges, ...newEdges],
          };
        });
        showToast(`Đã nạp thêm ${res.nodes.length} đỉnh lân cận`);
      } else {
        showToast('Đỉnh này không có liên kết mới nào để mở rộng');
      }
    } catch {
      showToast('Lỗi khi mở rộng lân cận');
    }
  };

  // Autocomplete debounce 250ms với AbortController
  const performAutocomplete = (query, setSuggestions, setActiveIdx) => {
    if (!query.trim()) {
      setSuggestions([]);
      setActiveIdx(-1);
      return;
    }

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await analyticsApi.searchGlobal({ q: query.trim(), limit: 6 });
        if (controller.signal.aborted) return;

        const results = [
          ...(res.users || []).map((u) => ({
            id: u.id,
            username: u.username,
            label: `@${u.username}`,
            type: 'User',
            fullName: u.fullName,
          })),
          ...(res.topics || []).map((t) => ({
            id: t.id,
            name: t.name,
            label: `#${t.name}`,
            type: 'Topic',
            fullName: t.name,
          })),
        ];

        setSuggestions(results);
        setActiveIdx(-1);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  };

  // Keyboard navigation cho autocomplete
  const handleAutocompleteKeyDown = (e, suggestions, activeIdx, setActiveIdx, onSelect, onClose) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        onSelect(suggestions[activeIdx]);
      } else if (suggestions.length > 0) {
        onSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Highlight cụm cộng đồng
  const handleToggleCommunityHighlight = (cid) => {
    if (String(communityHighlight) === String(cid)) {
      setCommunityHighlight(null);
    } else {
      setCommunityHighlight(String(cid));
      setSelectedId(null);
      setSelectedNode(null);
      setPathResult(null);
    }
    reapplySelectionStates();
  };

  // Phân tích đường đi ngắn nhất
  const handleAnalyzePath = async () => {
    if (!pathSource.trim() || !pathTarget.trim()) {
      showToast('Vui lòng nhập người dùng A và B');
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
      setSelectedId(null);
      setSelectedNode(null);
      setCommunityHighlight(null);
      reapplySelectionStates();
    } catch {
      showToast('Không tìm thấy đường đi giữa hai đỉnh');
    } finally {
      setIsPathSearching(false);
    }
  };

  // Toàn màn hình
  const handleToggleFullscreen = () => {
    if (!canvasWrapperRef.current) return;
    if (!document.fullscreenElement) {
      canvasWrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Zoom quanh tâm khung nhìn
  const handleZoom = (factor) => {
    const cy = cyRef.current;
    if (!cy) return;
    const currentZoom = cy.zoom();
    const newZoom = Math.max(0.15, Math.min(4, currentZoom * factor));
    cy.animate({
      zoom: {
        level: newZoom,
        position: { x: cy.width() / 2, y: cy.height() / 2 },
      },
      duration: 250,
    });
  };

  // Sao chép ID vào clipboard
  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    showToast(`Đã sao chép ID: ${id}`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Dữ liệu biểu đồ phân phối bậc chuẩn hóa (Power Law)
  const processedDegreeBuckets = useMemo(() => {
    const raw = stats?.degreeBuckets;
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      return [
        { bucket: '1 - 5', count: 4800 },
        { bucket: '6 - 15', count: 2600 },
        { bucket: '16 - 30', count: 1400 },
        { bucket: '31 - 60', count: 750 },
        { bucket: '61 - 120', count: 320 },
        { bucket: '> 120', count: 80 },
      ];
    }

    if (raw[0].bucket !== undefined) {
      return raw.map((b) => ({
        bucket: b.bucket,
        count: Number(b.count ?? b.users ?? 0),
      }));
    }

    const standardRanges = [
      { bucket: '0', min: 0, max: 0, count: 0 },
      { bucket: '1 - 5', min: 1, max: 5, count: 0 },
      { bucket: '6 - 15', min: 6, max: 15, count: 0 },
      { bucket: '16 - 30', min: 16, max: 30, count: 0 },
      { bucket: '31 - 60', min: 31, max: 60, count: 0 },
      { bucket: '61 - 120', min: 61, max: 120, count: 0 },
      { bucket: '> 120', min: 121, max: Infinity, count: 0 },
    ];

    for (const item of raw) {
      const deg = Number(item.degree ?? 0);
      const count = Number(item.users ?? item.count ?? 0);
      const target = standardRanges.find((r) => deg >= r.min && deg <= r.max);
      if (target) {
        target.count += count;
      }
    }

    return standardRanges.filter((r) => r.count > 0 || (r.min >= 1 && r.max <= 60));
  }, [stats?.degreeBuckets]);

  // Số liệu tổng quan
  const totalNodes = stats?.totalNodes || 40050;
  const totalEdges = stats?.totalEdges || 386500;
  const avgDegreeDirected = totalNodes > 0 ? totalEdges / totalNodes : 0;
  const avgDegreeUndirected = totalNodes > 0 ? (2 * totalEdges) / totalNodes : 0;
  const networkDensity = totalNodes > 1 ? (totalEdges / (totalNodes * (totalNodes - 1))) * 100 : 0;

  // Dữ liệu chủ đề
  const chartData = useMemo(() => {
    const source = trendingTopics.length > 0 ? trendingTopics : [
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
      {/* 1. HEADER CHÍNH                                          */}
      {/* ======================================================== */}
      <header className="h-14 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-30">
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

        {/* Global Search Bar với Autocomplete chuẩn debounce 250ms & phím tắt Ctrl+K */}
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
          <input
            ref={headerSearchInputRef}
            type="text"
            value={headerSearchQuery}
            onChange={(e) => {
              setHeaderSearchQuery(e.target.value);
              performAutocomplete(e.target.value, setHeaderSuggestions, setHeaderActiveIdx);
            }}
            onKeyDown={(e) =>
              handleAutocompleteKeyDown(
                e,
                headerSuggestions,
                headerActiveIdx,
                setHeaderActiveIdx,
                (item) => {
                  handleFocusOrLoadNode(item.label);
                  setHeaderSuggestions([]);
                  setHeaderSearchQuery('');
                },
                () => setHeaderSuggestions([])
              )
            }
            placeholder="Tìm đỉnh đồ thị, KOLs, cộng đồng… (gõ @user hoặc #topic)"
            className="w-full h-9 pl-9 pr-14 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#475569] bg-[#F1F5F9] border border-[#CBD5E1] rounded px-1.5 py-0.5 pointer-events-none shadow-2xs">
            Ctrl K
          </kbd>

          {headerSuggestions.length > 0 && (
            <div className="absolute top-11 left-0 right-0 bg-white border border-[#E2E8F0] rounded-[12px] shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-xs font-semibold text-[#64748B] px-2.5 py-1 uppercase">Gợi ý tìm kiếm</div>
              {headerSuggestions.map((item, idx) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => {
                    handleFocusOrLoadNode(item.label);
                    setHeaderSuggestions([]);
                    setHeaderSearchQuery('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    headerActiveIdx === idx ? 'bg-[#EFF6FF] text-[#2563EB]' : 'hover:bg-[#F1F5F9] text-[#0F172A]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.type === 'User' ? (
                      <Users className="h-3.5 w-3.5 text-[#2563EB]" />
                    ) : (
                      <Hash className="h-3.5 w-3.5 text-[#8B5CF6]" />
                    )}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <span className="text-xs text-[#64748B]">{item.fullName}</span>
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
      {/* 2. KHÔNG GIAN LÀM VIỆC 3 CỘT                            */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ------------------------------------------------------ */}
        {/* CỘT TRÁI: ĐIỀU HƯỚNG & BỘ LỌC (SIDEBAR)                */}
        {/* ------------------------------------------------------ */}
        <aside
          className={`bg-white border-r border-[#E2E8F0] shrink-0 flex flex-col justify-between transition-all duration-200 z-20 ${
            isLeftCollapsed ? 'w-16' : 'w-[280px]'
          } hidden lg:flex`}
        >
          {/* Vùng cuộn không lồng nhau */}
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

            {/* 2. Khối Bộ Lọc Sidebar dạng Accordion (Lọc tức thì không cần nút Áp dụng) */}
            {!isLeftCollapsed && (
              <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
                {/* Accordion 1: Loại Đỉnh */}
                <div className="border border-[#E2E8F0] rounded-[10px] overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => toggleSidebarAccordion('nodeTypes')}
                    className="w-full p-2.5 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-[#0F172A] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <CircleDot className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span>Loại Đỉnh (Node)</span>
                    </div>
                    {sidebarAccordions.nodeTypes ? <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />}
                  </button>

                  {sidebarAccordions.nodeTypes && (
                    <div className="p-2.5 flex flex-wrap gap-1.5 bg-white border-t border-[#E2E8F0]">
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
                            className={`px-2 py-1 rounded-[6px] text-xs font-medium flex items-center gap-1.5 transition-all border ${
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
                  )}
                </div>

                {/* Accordion 2: Loại Quan Hệ (7 Loại, nhãn 1 dòng) */}
                <div className="border border-[#E2E8F0] rounded-[10px] overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => toggleSidebarAccordion('relTypes')}
                    className="w-full p-2.5 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-[#0F172A] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Share2 className="h-3.5 w-3.5 text-[#F97316]" />
                      <span>Loại Cạnh (7 Quan hệ)</span>
                    </div>
                    {sidebarAccordions.relTypes ? <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />}
                  </button>

                  {sidebarAccordions.relTypes && (
                    <div className="p-2 space-y-1 bg-white border-t border-[#E2E8F0]">
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
                            className={`w-full flex items-center justify-between p-1.5 rounded-[6px] text-xs transition-all border ${
                              isChecked
                                ? 'bg-white border-[#CBD5E1] text-[#0F172A] shadow-2xs'
                                : 'bg-[#F8FAFC] border-transparent text-[#94A3B8] opacity-65'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate pr-1">
                              <span
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                  isChecked ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'border-[#CBD5E1] bg-white'
                                }`}
                              >
                                {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </span>
                              <span className="font-medium text-[#1E293B] truncate">{rel.vi}</span>
                              <span className="text-[10px] font-mono text-[#64748B]">({rel.en})</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-[#64748B] tabular-nums font-mono text-right">
                                {formatNumberVi(rel.count)}
                              </span>
                              <svg width="18" height="6" className="shrink-0">
                                <line
                                  x1="0"
                                  y1="3"
                                  x2="18"
                                  y2="3"
                                  stroke={rel.color}
                                  strokeWidth="2"
                                  strokeDasharray={rel.style === 'dashed' ? '3 2' : 'none'}
                                />
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Accordion 3: Khoảng Thời Gian */}
                <div className="border border-[#E2E8F0] rounded-[10px] overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => toggleSidebarAccordion('time')}
                    className="w-full p-2.5 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-[#0F172A] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#10B981]" />
                      <span>Khoảng thời gian</span>
                    </div>
                    {sidebarAccordions.time ? <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />}
                  </button>

                  {sidebarAccordions.time && (
                    <div className="p-2.5 space-y-2 bg-white border-t border-[#E2E8F0]">
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
                            className={`py-1 rounded text-center text-xs font-medium transition-colors ${
                              timePreset === preset.id
                                ? 'bg-[#2563EB] text-white shadow-2xs'
                                : 'bg-slate-50 text-[#475569] border border-[#E2E8F0] hover:bg-slate-100'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {timePreset === 'custom' && (
                        <div className="pt-1.5 space-y-1.5 animate-in fade-in duration-100">
                          <div>
                            <label className="text-xs text-[#64748B] block mb-0.5">Từ ngày</label>
                            <input
                              type="date"
                              value={dateRange.from}
                              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                              className="w-full text-xs p-1 bg-white border border-[#CBD5E1] rounded"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[#64748B] block mb-0.5">Đến ngày</label>
                            <input
                              type="date"
                              value={dateRange.to}
                              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                              className="w-full text-xs p-1 bg-white border border-[#CBD5E1] rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Cố Định Sidebar: Nút Đặt lại & Thu gọn */}
          <div className="p-3 border-t border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
            {!isLeftCollapsed ? (
              <>
                <button
                  type="button"
                  onClick={() => {
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
                    showToast('Đã đặt lại toàn bộ bộ lọc');
                  }}
                  className="text-xs font-medium text-[#64748B] hover:text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Đặt lại bộ lọc</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLeftCollapsed(true)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 text-[#64748B]"
                  title="Thu gọn sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsLeftCollapsed(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 text-[#64748B] mx-auto"
                title="Mở rộng sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </aside>

        {/* ------------------------------------------------------ */}
        {/* CỘT GIỮA: KHÔNG GIAN LÀM VIỆC CHÍNH                    */}
        {/* ------------------------------------------------------ */}
        <main className="flex-1 min-w-[500px] flex flex-col overflow-hidden bg-[#F8FAFC] relative">
          {/* Header thanh công cụ Cột Giữa */}
          <div className="h-12 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between gap-3 shrink-0 z-10">
            {/* Tên chức năng & Số phần tử hiển thị / đã nạp */}
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
                {activeMenu === 'explore' && 'Khám phá đồ thị'}
                {activeMenu === 'pagerank' && 'Xếp hạng ảnh hưởng & PageRank'}
                {activeMenu === 'communities' && 'Bản đồ Phân cụm Cộng đồng'}
                {activeMenu === 'shortest_path' && 'Tìm đường đi ngắn nhất'}
              </h1>
              {activeMenu !== 'overview' && (
                <span className="text-xs text-[#64748B] hidden md:inline font-mono">
                  • Đang hiển thị {visibleCounts.visibleNodes}/{visibleCounts.totalNodes} đỉnh, {visibleCounts.visibleEdges}/{visibleCounts.totalEdges} cạnh
                </span>
              )}
            </div>

            {/* Action Buttons: Dropdown Bố cục, Sắp xếp lại, Toàn màn hình, Xuất */}
            <div className="flex items-center gap-2">
              {activeMenu !== 'overview' && (
                <>
                  {/* Dropdown Layout */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
                      className="h-7 px-2.5 rounded-[6px] border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                      title="Chọn giải thuật bố cục đồ thị"
                    >
                      <Workflow className="h-3.5 w-3.5 text-[#2563EB]" />
                      <span className="hidden sm:inline">
                        {graphLayout === 'fcose' ? 'Lực fCoSE' : graphLayout === 'concentric' ? 'Đồng tâm' : graphLayout === 'circle' ? 'Vòng tròn' : 'Lưới'}
                      </span>
                      <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
                    </button>

                    {isLayoutDropdownOpen && (
                      <div className="absolute top-8 right-0 w-44 bg-white border border-[#E2E8F0] rounded-[10px] shadow-lg p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                        {[
                          { id: 'fcose', name: 'Lực đàn hồi (fCoSE)' },
                          { id: 'concentric', name: 'Đồng tâm (Concentric)' },
                          { id: 'circle', name: 'Vòng tròn (Circle)' },
                          { id: 'grid', name: 'Lưới đều (Grid)' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleChangeLayout(item.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs flex items-center justify-between ${
                              graphLayout === item.id ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold' : 'text-[#334155] hover:bg-slate-50'
                            }`}
                          >
                            <span>{item.name}</span>
                            {graphLayout === item.id && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nút Sắp xếp lại */}
                  <button
                    type="button"
                    onClick={() => {
                      runCurrentLayout({ fit: true, randomize: false });
                      showToast('Đã tính toán và sắp xếp lại bố cục');
                    }}
                    className="h-7 px-2 rounded-[6px] border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 flex items-center gap-1"
                    title="Chạy lại giải thuật bố cục"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-[#64748B]" />
                    <span className="hidden sm:inline">Sắp xếp lại</span>
                  </button>

                  {/* Nút Toàn màn hình */}
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="p-1.5 rounded-[6px] border border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] hover:bg-slate-50"
                    title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình canvas'}
                  >
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                </>
              )}

              {/* Nút Xuất PNG / JSON */}
              <button
                type="button"
                onClick={() => {
                  if (!cyRef.current) return;
                  const png64 = cyRef.current.png({ full: true, scale: 2, bg: isDarkCanvas ? '#0B1220' : '#FFFFFF' });
                  const link = document.createElement('a');
                  link.href = png64;
                  link.download = `falkordb-graph-${activeMenu}-${Date.now()}.png`;
                  link.click();
                  showToast('Đã xuất ảnh PNG đồ thị');
                }}
                className="h-7 px-2 rounded-[6px] border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 flex items-center gap-1"
                title="Xuất ảnh PNG chất lượng cao (2x)"
              >
                <Download className="h-3.5 w-3.5 text-[#64748B]" />
                <span className="hidden sm:inline">PNG</span>
              </button>

              {/* Toggle Right Panel */}
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
          <div className="px-4 py-1.5 bg-white/80 backdrop-blur-xs border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0 text-xs">
            <div className="flex items-center gap-2 text-[#475569] flex-wrap">
              <span className="text-[#64748B]">Phân tích</span>
              <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
              <span className="font-semibold text-[#0F172A]">
                {activeMenu === 'overview'
                  ? 'Tổng quan hệ thống'
                  : activeMenu === 'explore'
                  ? 'Khám phá đồ thị'
                  : activeMenu === 'pagerank'
                  ? 'KOLs & PageRank'
                  : activeMenu === 'communities'
                  ? 'Phân cụm cộng đồng'
                  : 'Đường đi ngắn nhất'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[#64748B]">Đang hiển thị:</span>
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
                {timePreset !== '30d' && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#475569] border border-slate-200 text-xs font-medium">
                    {timePreset === '7d' ? '7 ngày' : timePreset === '90d' ? '90 ngày' : 'Tùy chỉnh'}
                  </span>
                )}
              </div>
            </div>

            {/* Trạng thái Kết nối / Dữ liệu */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span className="text-xs text-[#64748B] font-medium">
                {isOffline ? 'Dữ liệu ngoại tuyến' : 'Đang kết nối FalkorDB'}
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: TỔNG QUAN HỆ THỐNG                                */}
          {/* ======================================================== */}
          {activeMenu === 'overview' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Thẻ Thống Kê Tổng Quan */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              {/* Biểu đồ tương tác Chủ đề */}
              <div className="bg-white p-5 rounded-[12px] border border-[#E2E8F0] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">Tương tác theo Chủ đề thảo luận</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      So sánh lượt Thích (Like), Bình luận (Comment) và Chia sẻ (Share) trên các chủ đề hàng đầu
                    </p>
                  </div>

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
                  <h2 className="text-sm font-semibold text-[#0F172A]">Phân phối bậc đồ thị (luật lũy thừa)</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Đa số đỉnh có bậc liên kết thấp; số ít đỉnh trung tâm nắm giữ hàng nghìn liên kết theo mô hình mạng không tỷ lệ (Scale-Free).
                  </p>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedDegreeBuckets} margin={{ top: 15, right: 15, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="bucket"
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        label={{
                          value: 'Bậc liên kết (Số cạnh / người dùng)',
                          position: 'insideBottom',
                          offset: -12,
                          style: { fill: '#64748B', fontSize: 11, textAnchor: 'middle' },
                        }}
                      />
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
                        formatter={(val) => [formatNumberVi(val) + ' đỉnh', 'Số lượng']}
                        labelFormatter={(label) => `Khoảng bậc: ${label} liên kết`}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          padding: '8px 12px',
                        }}
                      />
                      <Bar dataKey="count" name="Số lượng Đỉnh" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={48} />
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
            <div
              ref={canvasWrapperRef}
              className={`flex-1 relative overflow-hidden transition-colors ${
                isDarkCanvas ? 'bg-[#0B1220]' : 'bg-[#F8FAFC]'
              }`}
            >
              {/* Toolbar Khảo Sát Tâm Điểm (Tab Khám Phá) */}
              {activeMenu === 'explore' && (
                <div className="absolute top-3 left-4 right-4 z-20 max-w-xl mx-auto bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-[10px] p-2 shadow-sm flex items-center gap-2">
                  <Compass className="h-4 w-4 text-[#10B981] shrink-0" />
                  <div className="flex-1 relative">
                    <input
                      ref={centerSearchInputRef}
                      type="text"
                      value={centerSearchQuery}
                      onChange={(e) => {
                        setCenterSearchQuery(e.target.value);
                        performAutocomplete(e.target.value, setCenterSuggestions, setCenterActiveIdx);
                      }}
                      onKeyDown={(e) =>
                        handleAutocompleteKeyDown(
                          e,
                          centerSuggestions,
                          centerActiveIdx,
                          setCenterActiveIdx,
                          (item) => {
                            handleFocusOrLoadNode(item.label);
                            setCenterSuggestions([]);
                            setCenterSearchQuery('');
                          },
                          () => setCenterSuggestions([])
                        )
                      }
                      placeholder="Đặt tâm điểm khảo sát (vd: @alice, @admin, #api)..."
                      className="w-full h-7 bg-slate-50 border border-[#E2E8F0] rounded px-2 text-xs text-[#0F172A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />

                    {centerSuggestions.length > 0 && (
                      <div className="absolute top-8 left-0 right-0 bg-white border border-[#E2E8F0] rounded-[10px] shadow-lg p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                        {centerSuggestions.map((item, idx) => (
                          <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            onClick={() => {
                              handleFocusOrLoadNode(item.label);
                              setCenterSuggestions([]);
                              setCenterSearchQuery('');
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-[6px] text-xs flex items-center justify-between ${
                              centerActiveIdx === idx ? 'bg-[#EFF6FF] text-[#2563EB]' : 'hover:bg-[#F1F5F9] text-[#0F172A]'
                            }`}
                          >
                            <span className="font-medium">{item.label}</span>
                            <span className="text-xs text-[#64748B]">{item.fullName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                        Top KOLs có viền hào quang vàng
                      </span>
                    </div>
                    <span className="text-xs text-[#64748B]">Bấm vào KOL để định vị mạng lưới</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {kolsList.slice(0, 5).map((kol) => (
                      <button
                        key={kol.id}
                        type="button"
                        onClick={() => handleFocusOrLoadNode(kol.username)}
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
                    {communityHighlight && (
                      <button
                        type="button"
                        onClick={() => handleToggleCommunityHighlight(communityHighlight)}
                        className="text-xs text-[#64748B] hover:text-[#2563EB]"
                      >
                        Hiển thị tất cả cụm
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {communitiesList.slice(0, 8).map((c) => {
                      const cid = String(c.id);
                      const isSelected = String(communityHighlight) === cid;
                      const color = getSafeCommunityColor(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleToggleCommunityHighlight(cid)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'ring-2 ring-black text-white shadow-xs'
                              : 'bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#0F172A]'
                          }`}
                          style={{ backgroundColor: isSelected ? color : undefined }}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
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
                        onClick={() => {
                          setPathResult(null);
                          reapplySelectionStates();
                        }}
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
                      onClick={() => {
                        const temp = pathSource;
                        setPathSource(pathTarget);
                        setPathTarget(temp);
                      }}
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
                              onClick={() => handleFocusOrLoadNode(step)}
                              className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono font-medium hover:bg-amber-100"
                            >
                              @{step}
                            </button>
                            {idx < pathResult.steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-400" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Trạng thái Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 text-[#2563EB] animate-spin" />
                  <span className="text-xs font-medium text-[#475569]">Đang tải cấu trúc đồ thị...</span>
                </div>
              )}

              {/* Trạng thái Lỗi Banner */}
              {error && (
                <div className="absolute top-16 left-4 right-4 z-30 max-w-md mx-auto bg-rose-50 border border-rose-200 text-rose-800 rounded-[10px] p-3 text-xs flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadInitialData}
                    className="px-2 py-1 bg-white border border-rose-300 rounded font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Trạng thái Rỗng khi 0 node visible */}
              {visibleCounts.totalNodes > 0 && visibleCounts.visibleNodes === 0 && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
                  <div className="p-6 bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-[16px] shadow-lg max-w-sm space-y-2 pointer-events-auto">
                    <CircleDot className="h-8 w-8 text-[#94A3B8] mx-auto" />
                    <h3 className="text-sm font-semibold text-[#0F172A]">Không có đỉnh nào thỏa mãn bộ lọc</h3>
                    <p className="text-xs text-[#64748B]">
                      Tất cả các loại đỉnh hoặc quan hệ hiện đang bị ẩn. Vui lòng bật lại bộ lọc loại đỉnh ở cột bên trái để hiển thị đồ thị.
                    </p>
                    <button
                      type="button"
                      onClick={() => setNodeTypeFilters({ User: true, Post: true, Topic: true })}
                      className="mt-2 h-7 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-medium hover:bg-[#1D4ED8]"
                    >
                      Bật tất cả loại đỉnh
                    </button>
                  </div>
                </div>
              )}

              {/* Cytoscape Container */}
              <div ref={cyContainerRef} className="w-full h-full" />

              {/* Hover Tooltip (Hiển thị khi di chuột qua node) */}
              {hoveredNode && (
                <div
                  className="absolute z-30 pointer-events-none bg-[#0F172A] text-white text-xs p-2.5 rounded-[10px] shadow-xl space-y-1 transform -translate-x-1/2 -translate-y-full mb-3 animate-in fade-in zoom-in-95 duration-100"
                  style={{ left: hoveredNode.x, top: hoveredNode.y }}
                >
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>{hoveredNode.data.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-normal">
                      {hoveredNode.data.type}
                    </span>
                  </div>
                  {hoveredNode.data.fullName && (
                    <div className="text-[11px] text-slate-300">{hoveredNode.data.fullName}</div>
                  )}
                  <div className="pt-1 border-t border-slate-750 text-[11px] text-slate-300 space-y-0.5">
                    <div>Bậc liên kết: <strong className="text-white">{hoveredNode.data.degree || 0}</strong></div>
                    <div>PageRank: <strong className="text-amber-400">{formatPctVi((hoveredNode.data.pagerank || 0) * 100, 2)}</strong></div>
                    <div>Cộng đồng: <strong className="text-blue-400">#{hoveredNode.data.community || 1}</strong></div>
                  </div>
                </div>
              )}

              {/* Toolbar Nổi Góc Trên Phải Canvas */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-[10px] border border-[#E2E8F0] shadow-md">
                <button
                  type="button"
                  onClick={() => handleZoom(1.25)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A]"
                  title="Phóng to quanh tâm khung nhìn"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom(0.8)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A]"
                  title="Thu nhỏ quanh tâm khung nhìn"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => cyRef.current?.fit(50)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-[#475569] hover:text-[#0F172A]"
                  title="Căn vừa màn hình (Fit)"
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
                  title={isDarkCanvas ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối đồ thị'}
                >
                  {isDarkCanvas ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>

              {/* Legend (Chú Giải) Nổi Góc Dưới Trái - Thu gọn được, tiêu đề 1 dòng */}
              <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-[12px] border border-[#E2E8F0] shadow-md text-xs overflow-hidden max-w-xs transition-all">
                <button
                  type="button"
                  onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
                  className="w-full px-3 py-2 flex items-center justify-between gap-2 font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs uppercase tracking-wider">Chú giải đồ thị</span>
                  {isLegendCollapsed ? <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />}
                </button>

                {!isLegendCollapsed && (
                  <div className="p-3 pt-0 space-y-2 border-t border-[#F1F5F9]">
                    {/* Loại Node */}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                        <span className="text-xs text-[#475569]">User</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-2 rounded bg-[#F97316]" />
                        <span className="text-xs text-[#475569]">Post</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rotate-45 bg-[#8B5CF6]" />
                        <span className="text-xs text-[#475569]">Topic</span>
                      </div>
                    </div>

                    {/* 7 loại cạnh */}
                    <div className="pt-1.5 border-t border-[#F1F5F9] space-y-1">
                      <div className="text-[11px] text-[#64748B] font-medium">Màu sắc cạnh:</div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-[#475569]">
                        {ALL_REL_TYPES.map((r) => (
                          <div key={r.key} className="flex items-center gap-1.5">
                            <svg width="14" height="4" className="shrink-0">
                              <line
                                x1="0"
                                y1="2"
                                x2="14"
                                y2="2"
                                stroke={r.color}
                                strokeWidth="2"
                                strokeDasharray={r.style === 'dashed' ? '2 2' : 'none'}
                              />
                            </svg>
                            <span className="truncate">{r.vi}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chỉ hiện chip cộng đồng ở tab Cộng đồng */}
                    {activeMenu === 'communities' && (
                      <div className="pt-1.5 border-t border-[#F1F5F9]">
                        <div className="text-[11px] text-[#64748B] mb-1">Cộng đồng (Bấm lọc):</div>
                        <div className="flex flex-wrap gap-1">
                          {COMMUNITY_COLORS.map((color, idx) => {
                            const cid = String(idx + 1);
                            const isHighlighted = String(communityHighlight) === cid;
                            return (
                              <button
                                key={cid}
                                type="button"
                                onClick={() => handleToggleCommunityHighlight(cid)}
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
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ------------------------------------------------------ */}
        {/* CỘT PHẢI: CHI TIẾT THỰC THỂ & WIDGETS BỔ TRỢ          */}
        {/* ------------------------------------------------------ */}
        {isRightVisible && (
          <aside className="w-[340px] bg-white border-l border-[#E2E8F0] shrink-0 flex flex-col justify-between overflow-y-auto p-4 space-y-4 z-20 animate-in fade-in duration-150">
            <div className="space-y-4">
              {/* WIDGET CHI TIẾT THỰC THỂ NẰM Ở ĐẦU CỘT TRONG CÁC TAB ĐỒ THỊ */}
              {activeMenu !== 'overview' && (
                <div className="bg-white rounded-[10px] border border-[#E2E8F0] overflow-hidden shadow-xs">
                  <div
                    onClick={() => toggleWidget('entityDetail')}
                    className="p-3 bg-slate-50/70 hover:bg-slate-100 border-b border-[#E2E8F0] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <CircleDot className="h-4 w-4 text-[#2563EB]" />
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
                          <div className="text-xs font-medium text-[#475569]">Chọn một đỉnh trên đồ thị để xem chi tiết</div>
                          <p className="text-xs text-[#64748B]">
                            Nhấp vào bất kỳ người dùng, bài viết hoặc chủ đề để kiểm tra các thuộc tính kết nối.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Header thực thể */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center font-bold text-[#2563EB] text-sm shrink-0">
                              {selectedNode.username?.charAt(0).toUpperCase() || selectedNode.type?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs text-[#0F172A] truncate">
                                {selectedNode.fullName || selectedNode.label}
                              </div>
                              <div className="text-xs text-[#64748B] truncate font-mono">
                                ID: {selectedNode.id}
                              </div>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#F1F5F9] text-[#475569]">
                              {selectedNode.type}
                            </span>
                          </div>

                          {/* Thông số chi tiết */}
                          <div className="space-y-1.5 text-xs bg-[#F8FAFC] p-2.5 rounded-[8px] border border-[#E2E8F0]">
                            {selectedNode.content && (
                              <div className="p-2 bg-white rounded border border-[#E2E8F0] text-xs text-[#334155] mb-1">
                                "{selectedNode.content}"
                              </div>
                            )}
                            {selectedNode.type === 'User' && (
                              <>
                                <div className="flex items-center justify-between py-0.5 border-b border-[#F1F5F9]">
                                  <span className="text-[#64748B]">Người theo dõi:</span>
                                  <span className="font-semibold text-[#0F172A] tabular-nums">
                                    {formatNumberVi(selectedNode.followers)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-0.5 border-b border-[#F1F5F9]">
                                  <span className="text-[#64748B]">Số bài viết:</span>
                                  <span className="font-semibold text-[#0F172A] tabular-nums">
                                    {formatNumberVi(selectedNode.posts)}
                                  </span>
                                </div>
                              </>
                            )}
                            <div className="flex items-center justify-between py-0.5 border-b border-[#F1F5F9]">
                              <span className="text-[#64748B]">Bậc vào / ra / tổng:</span>
                              <span className="font-semibold text-[#0F172A] tabular-nums font-mono">
                                {selectedNode.inDegree || 0} / {selectedNode.outDegree || 0} / {selectedNode.degree || 0}
                              </span>
                            </div>
                            <div className="py-0.5 border-b border-[#F1F5F9] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[#64748B]">Điểm PageRank:</span>
                                <span className="font-semibold text-[#2563EB] tabular-nums">
                                  {formatPctVi((selectedNode.pagerank || 0) * 100, 2)}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#2563EB] rounded-full"
                                  style={{ width: `${Math.min(100, (selectedNode.pagerank || 0) * 300)}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-0.5">
                              <span className="text-[#64748B]">Cộng đồng:</span>
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                                style={{ backgroundColor: selectedNode.communityColor || getSafeCommunityColor(selectedNode.community) }}
                              >
                                Cụm #{selectedNode.community || 1}
                              </span>
                            </div>
                          </div>

                          {/* 4 Nút Hành Động */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleExpandNeighborhood(selectedNode.username || selectedNode.id)}
                              className="h-7 px-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] text-xs font-medium text-[#334155] flex items-center justify-center gap-1 transition-colors"
                              title="Tải thêm các đỉnh láng giềng kề cận"
                            >
                              <Sparkles className="h-3 w-3 text-[#2563EB]" />
                              <span>Mở rộng</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPathSource(selectedNode.username || selectedNode.id);
                                setActiveMenu('shortest_path');
                                showToast(`Đã đặt @${selectedNode.username || selectedNode.id} làm điểm A`);
                              }}
                              className="h-7 px-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] text-xs font-medium text-[#334155] flex items-center justify-center gap-1 transition-colors"
                              title="Đặt làm điểm bắt đầu"
                            >
                              <RouteIcon className="h-3 w-3 text-[#10B981]" />
                              <span>Đặt A</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPathTarget(selectedNode.username || selectedNode.id);
                                setActiveMenu('shortest_path');
                                showToast(`Đã đặt @${selectedNode.username || selectedNode.id} làm điểm B`);
                              }}
                              className="h-7 px-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] text-xs font-medium text-[#334155] flex items-center justify-center gap-1 transition-colors"
                              title="Đặt làm điểm kết thúc"
                            >
                              <RouteIcon className="h-3 w-3 text-[#F97316]" />
                              <span>Đặt B</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyId(selectedNode.id)}
                              className="h-7 px-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-[6px] text-xs font-medium text-[#334155] flex items-center justify-center gap-1 transition-colors"
                              title="Sao chép ID thực thể"
                            >
                              {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-[#64748B]" />}
                              <span>{copiedId ? 'Đã chép' : 'Chép ID'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* WIDGET: PHÂN BỐ LOẠI QUAN HỆ */}
              <div className="bg-white rounded-[10px] border border-[#E2E8F0] overflow-hidden">
                <div
                  onClick={() => toggleWidget('relTypes')}
                  className="p-3 bg-slate-50/70 hover:bg-slate-100 border-b border-[#E2E8F0] flex items-center justify-between cursor-pointer transition-colors"
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
                            <div className="text-xs text-[#64748B]">{formatNumberVi(item.count)} liên kết</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-[10px] text-xs text-blue-900 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-[#2563EB]" />
                        <span>Ý nghĩa phân tích vĩ mô</span>
                      </div>
                      <p className="text-xs text-blue-800 leading-relaxed">{macroAnalysisText}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* WIDGET: TOP 5 INFLUENCER */}
              <div className="bg-white rounded-[10px] border border-[#E2E8F0] overflow-hidden">
                <div
                  onClick={() => toggleWidget('influencers')}
                  className="p-3 bg-slate-50/70 hover:bg-slate-100 border-b border-[#E2E8F0] flex items-center justify-between cursor-pointer transition-colors"
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
                        onClick={() => handleFocusOrLoadNode(kol.username)}
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

              {/* WIDGET: CHỦ ĐỀ HOT (TOP 5) */}
              <div className="bg-white rounded-[10px] border border-[#E2E8F0] overflow-hidden">
                <div
                  onClick={() => toggleWidget('hotTopics')}
                  className="p-3 bg-slate-50/70 hover:bg-slate-100 border-b border-[#E2E8F0] flex items-center justify-between cursor-pointer transition-colors"
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
            </div>
          </aside>
        )}
      </div>

      {/* Drawer Mobile */}
      {isMobileLeftOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsMobileLeftOpen(false)} />
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
