import { ChatPanel } from '@/components/chat/ChatPanel';
import { TraceTimeline } from '@/components/timeline/TraceTimeline';
import { ContextInspector } from '@/components/inspector/ContextInspector';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="grid grid-cols-3 h-screen">
        <div className="col-span-1 border-r bg-white p-4 overflow-y-auto">
          <ChatPanel />
        </div>
        <div className="col-span-1 border-r bg-white p-4 overflow-y-auto">
          <TraceTimeline />
        </div>
        <div className="col-span-1 bg-white p-4 overflow-y-auto">
          <ContextInspector />
        </div>
      </div>
    </main>
  );
}
