import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title, description, sprint = 'Sprint 1 - 2' }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-panel rounded-2xl p-8 border border-surfaceBorder text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-user/20 border border-user/40 text-user flex items-center justify-center mx-auto">
          <Construction className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="text-xs text-muted mt-1">{description}</p>
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-topic/10 border border-topic/30 text-topic text-[11px] font-semibold">
          Lộ trình: {sprint}
        </div>
      </div>
    </div>
  );
}
