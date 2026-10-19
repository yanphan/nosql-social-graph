export function timeAgo(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - Number(timestamp);

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Vừa xong';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  const date = new Date(Number(timestamp));
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toLocaleString('vi-VN');
}
