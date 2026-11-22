import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  mockUsers, 
  mockTopics
} from '@/mock/mockData';
import { authService } from '@/services/auth';
import { topicsService } from '@/services/topics';
import { postsService } from '@/services/posts';
import { recommendService } from '@/services/recommend';
import PostCard from '@/components/post/PostCard';
import SuggestionsPage from '@/pages/SuggestionsPage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Network, 
  Search, 
  Home as HomeIcon, 
  Bell, 
  ChevronDown, 
  Plus, 
  TrendingUp, 
  X, 
  CheckCircle2, 
  Users,
  Check,

  LogOut, 
  Send,
  Sparkles,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { getTopicColor } from '@/lib/topicColor';
import '@/styles/tokens.css';

export default function MainLayout({ view = 'feed' }) {
  const navigate = useNavigate();
  const [currentUser] = useState(() => authService.getStoredUser());
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [followedUsers, setFollowedUsers] = useState({});
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTopic, setNewPostTopic] = useState('');
  const [activeTab, setActiveTab] = useState('feed');
  const [topicTab, setTopicTab] = useState('trending'); // 'trending' | 'mine'
  const [unreadCount] = useState(3);
  const [isScrolled, setIsScrolled] = useState(false);
  const [feedMode, setFeedMode] = useState('forYou'); // 'forYou' | 'latest'

  // Feed posts state
  const [postsList, setPostsList] = useState([]);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load real friend suggestions from FalkorDB backend (BT3 - UC-11)
  useEffect(() => {
    let isMounted = true;
    setLoadingSuggestions(true);
    recommendService.getFriendRecommendations(5)
      .then((data) => {
        if (isMounted && data) {
          setFriendSuggestions(data);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải gợi ý theo dõi:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingSuggestions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // Load real posts from FalkorDB backend (Chế độ Gợi ý đồ thị hoặc Mới nhất)
  useEffect(() => {
    if (feedMode === 'forYou' && !selectedTopic) {
      postsService.getRecommendPosts(30).then((items) => {
        if (items && items.length > 0) {
          setPostsList(items);
        } else {
          postsService.getPosts({ limit: 30 }).then((data) => {
            if (data?.items) setPostsList(data.items);
          });
        }
      });
    } else {
      postsService.getPosts({ topic: selectedTopic || undefined, limit: 30 }).then((data) => {
        if (data?.items && data.items.length > 0) {
          setPostsList(data.items);
        }
      });
    }
  }, [feedMode, selectedTopic]);

  // Real backend topics states
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [userInterests, setUserInterests] = useState([]);

  useEffect(() => {
    topicsService.getTrendingTopics({ limit: 5 }).then((data) => {
      if (data && data.length > 0) setTrendingTopics(data);
    });
    topicsService.getMyInterests().then((data) => {
      if (data && data.length > 0) setUserInterests(data);
    });
  }, [currentUser?.id]);

  // Scroll listener for topbar faint bottom shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filtered posts based on selected topic
  const filteredPosts = selectedTopic 
    ? postsList.filter((p) => p.topics?.some((t) => t.name === selectedTopic) || p.topicNames?.includes(selectedTopic))
    : postsList;

  // Toggle follow/like suggestion via real backend API
  const toggleFollow = async (userId) => {
    const isCurrentlyFollowed = !!followedUsers[userId];
    setFollowedUsers((prev) => ({
      ...prev,
      [userId]: !isCurrentlyFollowed,
    }));

    try {
      if (isCurrentlyFollowed) {
        await recommendService.unfollowUser(userId);
      } else {
        await recommendService.followUser(userId);
      }
    } catch (err) {
      console.error('Lỗi thay đổi trạng thái theo dõi:', err);
      // Revert on failure
      setFollowedUsers((prev) => ({
        ...prev,
        [userId]: isCurrentlyFollowed,
      }));
    }
  };

  // Create post handler
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const cleanTopic = newPostTopic.trim().replace(/^#/, '');
    const topicObj = cleanTopic ? { id: cleanTopic, name: cleanTopic } : null;

    try {
      const created = await postsService.createPost({
        content: newPostContent.trim(),
        topics: cleanTopic ? [cleanTopic] : [],
      });

      const newPost = {
        ...created,
        author: currentUser,
        likeCount: 0,
        shareCount: 0,
        commentCount: 0,
        topicNames: topicObj ? [topicObj.name] : [],
        topics: topicObj ? [topicObj] : [],
        createdAt: Date.now(),
      };
      setPostsList((prev) => [newPost, ...prev]);
    } catch (err) {
      console.warn('Lỗi tạo bài viết backend:', err.message);
      const createdPost = {
        id: `post_${Date.now()}`,
        authorId: currentUser.id,
        author: currentUser,
        content: newPostContent.trim(),
        createdAt: Date.now(),
        likeCount: 0,
        shareCount: 0,
        commentCount: 0,
        topicNames: topicObj ? [topicObj.name] : [],
        topics: topicObj ? [topicObj] : [],
      };
      setPostsList([createdPost, ...postsList]);
    }

    setNewPostContent('');
    setNewPostTopic('');
    setIsCreatePostOpen(false);
  };

  // Greeting by time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
    if (hour >= 12 && hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // Given name (first word of fullName) e.g. "Alice Nguyen" -> "Alice"
  const givenName = currentUser?.fullName?.trim()?.split(' ')?.[0] || currentUser?.fullName || '';

  // Một dòng gợi ý theo dõi (dùng ở cột phải và hộp thoại "Tất cả")
  const renderSuggestion = (user) => {
    const isFollowed = followedUsers[user.id] ?? false;

    return (
      <div key={user.id} className="flex items-center justify-between gap-3 group">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4`}
            alt={user.fullName || user.username}
            className="w-9 h-9 rounded-full object-cover bg-slate-100 ring-2 ring-white border border-[#E5E9F0] shrink-0"
          />
          <div className="min-w-0">
            <div className="font-semibold text-xs text-[#0F172A] truncate hover:text-[#2563EB] cursor-pointer">
              {user.fullName || user.username}
            </div>
            {/* Secondary text: 13px #64748B chuẩn AA */}
            <div className="text-[12px] text-[#64748B] truncate tabular-nums" title={user.reason}>
              {user.reason || (user.mutual ? `${user.mutual} kết nối chung` : `${user.followers || 0} người theo dõi`)}
            </div>
          </div>
        </div>

        {/* Nút theo dõi dạng chữ (+ Theo dõi / ✓ Đang theo dõi), tránh icon kiểu "kết bạn" */}
        <button
          type="button"
          onClick={() => toggleFollow(user.id)}
          aria-pressed={isFollowed}
          aria-label={`${isFollowed ? 'Bỏ theo dõi' : 'Theo dõi'} ${user.fullName || user.username}`}
          className={`shrink-0 h-8 px-2.5 rounded-[10px] text-xs font-semibold flex items-center gap-1 transition-colors duration-150 btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
            isFollowed
              ? 'bg-[#EFF4FF] text-[#1D4ED8] border border-[#BFDBFE]'
              : 'border border-[#E5E9F0] text-[#1D4ED8] hover:bg-[#EFF4FF]'
          }`}
        >
          {isFollowed ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>{isFollowed ? 'Đang theo dõi' : 'Theo dõi'}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9] bg-[radial-gradient(ellipse_100%_320px_at_50%_0%,rgba(239,244,255,0.6),transparent)] text-[#0F172A] flex flex-col font-sans antialiased">
      {/* ======================================================== */}
      {/* 1. TOP NAVBAR                                            */}
      {/* ======================================================== */}
      <header className={`sticky top-0 z-40 w-full bg-white border-b border-[#E5E9F0] px-4 sm:px-8 py-2.5 transition-shadow duration-150 ease-out ${
        isScrolled ? 'shadow-[0_2px_8px_rgba(15,23,42,0.05)]' : ''
      }`}>
        <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4 sm:gap-6">
          {/* Logo Brand Bên Trái: Flat Monogram */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group btn-press">
            <div className="h-9 w-9 rounded-[10px] bg-[#EFF4FF] text-[#2563EB] flex items-center justify-center transition-colors duration-150 group-hover:bg-[#DBEAFE]">
              <Network className="h-5 w-5" />
            </div>
            <span className="font-semibold text-[15px] tracking-[-0.01em] text-[#0F172A]">
              FalkorDB <span className="text-[#2563EB]">Social</span>
            </span>
          </Link>

          {/* Navigation Pills Ở Giữa */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Điều hướng chính">
            {[
              { to: '/', key: 'feed', label: 'Bảng tin', Icon: HomeIcon },
              { to: '/suggestions', key: 'suggestions', label: 'Gợi ý theo dõi', Icon: Users },
            ].map(({ to, key, label, Icon }) => (
              <Link
                key={key}
                to={to}
                aria-current={view === key ? 'page' : undefined}
                className={`h-9 px-3.5 rounded-[10px] text-xs font-medium flex items-center gap-2 transition-colors duration-150 btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
                  view === key
                    ? 'bg-[#EFF4FF] text-[#2563EB]'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* Search Bar: 1px border, white background, Ctrl K hint */}
          <div className="flex-1 max-w-sm hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
              <input
                type="text"
                placeholder="Tìm bài viết, chủ đề, người dùng…"
                className="w-full h-9 pl-9 pr-14 bg-white border border-[#E5E9F0] rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all duration-150"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#64748B] border border-[#E5E9F0] rounded px-1.5 py-0.5 pointer-events-none">
                Ctrl K
              </span>
            </div>
          </div>

          {/* Right Actions: Notifications + User Dropdown */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Bell icon có badge khi unread > 0 */}
            <button 
              className="relative h-9 w-9 rounded-[10px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 flex items-center justify-center transition-colors duration-150 btn-press"
              title="Thông báo"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2563EB]" />
              )}
            </button>

            {/* Profile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-[10px] hover:bg-slate-100 transition-colors duration-150 btn-press focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full object-cover bg-slate-100 ring-2 ring-white border border-[#E5E9F0]"
                  />
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-[#0F172A] leading-tight flex items-center gap-1">
                      {currentUser.fullName}
                      {currentUser.isVerified && <CheckCircle2 className="h-3 w-3 text-[#2563EB]" />}
                    </div>
                    <div className="text-[11px] text-[#64748B] tabular-nums">
                      @{currentUser.username}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-[#64748B] ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white text-[#475569] shadow-md border border-[#E5E9F0] rounded-[12px] p-1.5 animate-in fade-in zoom-in-95 duration-120">
                <div className="px-3 py-2 border-b border-[#E5E9F0] mb-1">
                  <div className="text-xs font-semibold text-[#0F172A] truncate">{currentUser.fullName}</div>
                  <div className="text-[11px] text-[#64748B] tabular-nums">@{currentUser.username}</div>
                  {/* Thống kê người dùng hiển thị trong dropdown (tiện lợi khi ẩn sidebar phải) */}
                  <div className="grid grid-cols-3 gap-1 pt-2 mt-1 text-center border-t border-[#E5E9F0]/60">
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] tabular-nums">
                        {currentUser.postsCount ?? 24}
                      </div>
                      <div className="text-[10px] text-[#64748B]">Bài viết</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] tabular-nums">
                        {currentUser.followersCount ?? 64}
                      </div>
                      <div className="text-[10px] text-[#64748B]">Theo dõi</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] tabular-nums">
                        {currentUser.followingCount ?? 50}
                      </div>
                      <div className="text-[10px] text-[#64748B]">Đang theo</div>
                    </div>
                  </div>
                </div>

                {/* Admin cũng là một thành viên: dùng giao diện này để đăng bài, có lối tắt về trang quản trị */}
                {currentUser.role === 'admin' && (
                  <DropdownMenuItem
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Trang quản trị</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => {
                    authService.logout();
                    navigate('/login', { replace: true });
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN LAYOUT: 3 CỘT (Sticky sidebars at top 88px)       */}
      {/* ======================================================== */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-8">
        {view === 'suggestions' ? (
          <SuggestionsPage followedUsers={followedUsers} onToggleFollow={toggleFollow} />
        ) : (
        <div className="flex justify-center gap-6 w-full">
          {/* ================= CỘT TRÁI (LEFT SIDEBAR) ================= */}
          {/* Sticky at top 88px, Ẩn dưới 1024px */}
          <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-[88px] self-start space-y-4">
            {/* Card 1: Gợi ý theo dõi */}
            <div className="bg-white rounded-[16px] p-5 border border-[#E5E9F0] card-hover shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4 animate-fade-up stagger-1">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[#0F172A]">Gợi ý theo dõi</h3>
                <Link
                  to="/suggestions"
                  className="text-xs text-[#2563EB] hover:underline font-medium rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Tất cả
                </Link>
              </div>

              <div className="space-y-3">
                {loadingSuggestions ? (
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2.5 animate-pulse">
                        <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-slate-200 rounded w-24" />
                          <div className="h-2.5 bg-slate-100 rounded w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : friendSuggestions.length === 0 ? (
                  <div className="text-xs text-[#64748B] py-2 text-center">
                    Chưa có gợi ý mới
                  </div>
                ) : (
                  friendSuggestions.map(renderSuggestion)
                )}
              </div>
            </div>
          </aside>

          {/* ================= CỘT GIỮA (CENTER FEED) ================= */}
          <main className="flex-1 max-w-2xl xl:max-w-3xl min-w-0 space-y-4">
            {/* LỜI CHÀO SỬ DỤNG GIVEN NAME ("Alice Nguyen" -> "Alice") */}
            <div className="text-[14px] font-medium text-[#475569] px-1 animate-fade-up">
              {getGreeting()}, {givenName}
            </div>

            {/* INLINE COMPOSER AT TOP OF FEED (Nút Đăng bài duy nhất gần feed top) */}
            <div className="bg-white rounded-[16px] p-4 border border-[#E5E9F0] card-hover shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center gap-3 animate-fade-up stagger-1">
              <img
                src={currentUser?.avatar}
                alt={currentUser?.fullName}
                className="w-9 h-9 rounded-full object-cover bg-slate-100 ring-2 ring-white border border-[#E5E9F0] shrink-0"
              />
              <button
                type="button"
                onClick={() => setIsCreatePostOpen(true)}
                className="flex-1 h-9 px-3.5 text-left text-xs text-[#64748B] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E5E9F0] rounded-[10px] transition-colors duration-150 btn-press"
              >
                Bạn đang nghĩ gì?
              </button>
              <button
                type="button"
                onClick={() => setIsCreatePostOpen(true)}
                className="h-9 px-3.5 rounded-[10px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 btn-press shrink-0 shadow-2xs"
              >
                <Plus className="h-4 w-4" />
                <span>Đăng bài</span>
              </button>
            </div>

            {/* 2 TABS CHUYỂN ĐỔI CHẾ ĐỘ BẢNG TIN: Dành cho bạn (Gợi ý đồ thị BT4) | Mới nhất */}
            <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E5E9F0] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] w-fit animate-fade-up">
              <button
                onClick={() => {
                  setFeedMode('forYou');
                  setSelectedTopic(null);
                }}
                className={`text-xs px-3.5 py-1.5 rounded-[8px] font-semibold transition-all duration-150 btn-press flex items-center gap-1.5 ${
                  feedMode === 'forYou' && !selectedTopic
                    ? 'bg-[#EFF4FF] text-[#2563EB] shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Dành cho bạn</span>
              </button>
              <button
                onClick={() => setFeedMode('latest')}
                className={`text-xs px-3.5 py-1.5 rounded-[8px] font-semibold transition-all duration-150 btn-press flex items-center gap-1.5 ${
                  feedMode === 'latest' || selectedTopic
                    ? 'bg-[#EFF4FF] text-[#2563EB] shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Mới nhất</span>
              </button>
            </div>

            {/* BỘ LỌC CHỦ ĐỀ ĐANG CHỌN */}
            {selectedTopic && (
              <div className="bg-white rounded-[12px] px-4 py-2.5 border border-[#E5E9F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center justify-between text-xs animate-fade-up">
                <span className="text-[#475569]">
                  Đang lọc bài viết theo: <strong className="text-[#2563EB]">#{selectedTopic}</strong>
                </span>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="text-xs text-[#64748B] hover:text-[#0F172A] font-medium btn-press"
                >
                  Xóa lọc
                </button>
              </div>
            )}

            {/* DÒNG BÀI VIẾT (POSTS FEED) */}
            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="bg-white rounded-[16px] p-8 border border-[#E5E9F0] text-center text-xs text-[#64748B] space-y-2">
                  <p>Không có bài viết nào thuộc chủ đề này.</p>
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="text-[#2563EB] hover:underline font-medium"
                  >
                    Xem tất cả bài viết
                  </button>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onTopicClick={setSelectedTopic}
                    currentUser={currentUser}
                    selectedTopic={selectedTopic}
                  />
                ))
              )}
            </div>
          </main>

          {/* ================= CỘT PHẢI (RIGHT SIDEBAR) ================= */}
          {/* Sticky at top 88px, Ẩn dưới 1280px */}
          <aside className="hidden xl:flex flex-col w-72 xl:w-80 shrink-0 sticky top-[88px] self-start space-y-4">
            {/* WIDGET 1: USER PROFILE CARD (56px Gradient Cover + Overlapping Avatar) */}
            <div className="bg-white rounded-[16px] border border-[#E5E9F0] card-hover shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden animate-fade-up stagger-1">
              {/* 56px soft gradient cover (#DBEAFE -> #EFF4FF) */}
              <div className="h-14 w-full bg-gradient-to-r from-[#DBEAFE] to-[#EFF4FF]" />

              <div className="px-5 pb-5 pt-0 space-y-3">
                {/* Avatar overlapping the bottom edge with 2px white ring */}
                <div className="-mt-7">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.fullName}
                    style={{ width: '56px', height: '56px' }}
                    className="w-14 h-14 rounded-full object-cover bg-slate-100 ring-2 ring-white border border-[#E5E9F0] shadow-xs shrink-0"
                  />
                </div>

                {/* Name and @username below the avatar */}
                <div className="min-w-0">
                  <h4 className="font-semibold text-[14px] text-[#0F172A] truncate">
                    {currentUser.fullName}
                  </h4>
                  <p className="text-[12px] text-[#64748B] tabular-nums truncate">
                    @{currentUser.username}
                  </p>
                </div>

                {/* 3 Cột số liệu thống kê: 18px/600 font, hover = accent */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#E5E9F0] text-center">
                  <div className="group cursor-pointer">
                    <div className="font-semibold text-[#0F172A] group-hover:text-[#2563EB] text-[18px] tabular-nums transition-colors duration-150">
                      {currentUser.postsCount ?? currentUser.posts ?? 24}
                    </div>
                    <div className="text-[13px] text-[#64748B]">Bài viết</div>
                  </div>
                  <div className="group cursor-pointer">
                    <div className="font-semibold text-[#0F172A] group-hover:text-[#2563EB] text-[18px] tabular-nums transition-colors duration-150">
                      {currentUser.followersCount ?? currentUser.followers ?? 64}
                    </div>
                    <div className="text-[13px] text-[#64748B]">Theo dõi</div>
                  </div>
                  <div className="group cursor-pointer">
                    <div className="font-semibold text-[#0F172A] group-hover:text-[#2563EB] text-[18px] tabular-nums transition-colors duration-150">
                      {currentUser.followingCount ?? currentUser.following ?? 50}
                    </div>
                    <div className="text-[13px] text-[#64748B]">Đang theo</div>
                  </div>
                </div>
              </div>
            </div>

            {/* WIDGET 2: CHỦ ĐỀ GỘP 2 TAB (Thịnh hành | Của bạn) VỚI PASTEL DOTS */}
            <div className="bg-white rounded-[16px] p-5 border border-[#E5E9F0] card-hover shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3.5 animate-fade-up stagger-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#E5E9F0]/60">
                <h3 className="text-[14px] font-semibold text-[#0F172A]">Chủ đề</h3>
                
                {/* 2 Tabs chuyển đổi nhẹ nhàng */}
                <div className="flex items-center gap-1 p-0.5 bg-[#F8FAFC] border border-[#E5E9F0] rounded-[8px]">
                  <button
                    onClick={() => setTopicTab('trending')}
                    className={`text-xs px-2.5 py-1 rounded-[6px] font-medium transition-all duration-150 btn-press ${
                      topicTab === 'trending'
                        ? 'bg-[#EFF4FF] text-[#2563EB] shadow-2xs font-semibold'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Thịnh hành
                  </button>
                  <button
                    onClick={() => setTopicTab('mine')}
                    className={`text-xs px-2.5 py-1 rounded-[6px] font-medium transition-all duration-150 btn-press ${
                      topicTab === 'mine'
                        ? 'bg-[#EFF4FF] text-[#2563EB] shadow-2xs font-semibold'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Của bạn
                  </button>
                </div>
              </div>

              {/* Nội dung Tab Thịnh hành */}
              {topicTab === 'trending' && (
                <div className="space-y-1.5 pt-0.5">
                  {(trendingTopics.length > 0 ? trendingTopics : mockTopics.slice(0, 5)).map((topic, index) => {
                    const isSelected = selectedTopic === topic.name;
                    const dotColor = getTopicColor(topic.name);

                    return (
                      <div
                        key={topic.id || topic.name}
                        onClick={() => setSelectedTopic(isSelected ? null : topic.name)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors duration-150 ${
                          isSelected 
                            ? 'bg-[#EFF4FF] text-[#2563EB] font-medium'
                            : 'hover:bg-slate-50 text-[#0F172A]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#64748B] font-semibold tabular-nums w-4">
                            #{index + 1}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                          <span className="font-medium text-[#2563EB]">#{topic.name}</span>
                        </div>
                        <span className="text-[12px] text-[#64748B] tabular-nums">
                          {topic.postCount ?? topic.interactions ?? topic.likes ?? 8} bài
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Nội dung Tab Của bạn (dạng chips kèm pastel dot & X khi active) */}
              {topicTab === 'mine' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(userInterests.length > 0 ? userInterests : mockTopics).map((topic) => {
                    const isSelected = selectedTopic === topic.name;
                    const dotColor = getTopicColor(topic.name);

                    return (
                      <button
                        key={topic.id || topic.name}
                        onClick={() => setSelectedTopic(isSelected ? null : topic.name)}
                        className={`h-8 px-3 rounded-[10px] text-xs font-medium flex items-center gap-1.5 transition-all duration-150 btn-press ${
                          isSelected
                            ? 'bg-[#EFF4FF] text-[#2563EB] border border-[#2563EB]/30'
                            : 'bg-white border border-[#E5E9F0] text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB]'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        <span>#{topic.name}</span>
                        {isSelected && <X className="h-3 w-3 text-[#2563EB]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. MOBILE BOTTOM NAVIGATION (Hiện dưới 640px)             */}
      {/* ======================================================== */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E9F0] px-4 py-2 flex items-center justify-around shadow-sm">
        <button
          onClick={() => {
            setActiveTab('feed');
            setSelectedTopic(null);
          }}
          className={`flex flex-col items-center gap-1 text-[11px] ${
            activeTab === 'feed' ? 'text-[#2563EB] font-medium' : 'text-[#64748B]'
          }`}
        >
          <HomeIcon className="h-4 w-4" />
          <span>Bảng tin</span>
        </button>

        <button
          onClick={() => setIsCreatePostOpen(true)}
          className="flex flex-col items-center gap-1 text-[11px] text-[#2563EB] font-medium"
        >
          <div className="h-7 w-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
            <Plus className="h-4 w-4" />
          </div>
          <span>Đăng bài</span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* 4. MODAL DIALOG: CREATE POST                            */}
      {/* ======================================================== */}
      {/* 4A. CREATE POST MODAL */}
      <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
        <DialogContent className="sm:max-w-lg bg-white text-[#0F172A] border border-[#E5E9F0] p-6 rounded-[16px] shadow-xl animate-in fade-in zoom-in-95 duration-120">
          <DialogHeader className="pb-3 border-b border-[#E5E9F0]">
            <DialogTitle className="text-base font-semibold text-[#0F172A]">
              Tạo bài viết mới
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreatePost} className="space-y-4 pt-3">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="w-9 h-9 rounded-full object-cover bg-slate-100 ring-2 ring-white border border-[#E5E9F0]"
              />
              <div>
                <div className="font-semibold text-xs text-[#0F172A]">{currentUser.fullName}</div>
                <div className="text-[11px] text-[#64748B]">Đăng công khai</div>
              </div>
            </div>

            <textarea
              rows={4}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Chia sẻ suy nghĩ của bạn về cơ sở dữ liệu đồ thị, thuật toán, mạng xã hội…"
              className="w-full p-3 text-xs text-[#0F172A] placeholder:text-[#64748B] bg-[#F8FAFC] border border-[#E5E9F0] rounded-[12px] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] resize-none"
            />

            <div>
              <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">
                Gắn chủ đề bài viết:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {mockTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setNewPostTopic(newPostTopic === topic.name ? '' : topic.name)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-colors duration-150 btn-press flex items-center gap-1.5 ${
                      newPostTopic === topic.name
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#EFF4FF] text-[#2563EB] hover:bg-blue-100'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getTopicColor(topic.name) }} />
                    <span>#{topic.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E9F0]">
              <button
                type="button"
                onClick={() => setIsCreatePostOpen(false)}
                className="h-9 px-4 rounded-[10px] text-xs font-medium text-[#475569] hover:bg-slate-100 transition-colors duration-150 btn-press"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!newPostContent.trim()}
                className="h-9 px-5 rounded-[10px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 btn-press shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Đăng bài</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
