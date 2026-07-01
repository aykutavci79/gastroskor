import { BusinessApplyBackground } from '@/components/BusinessApplyBackground';
import { BusinessApplyForceLight } from '@/components/BusinessApplyForceLight';

export default function BusinessApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessApplyForceLight>
      <div className="business-apply-page relative left-1/2 min-h-[calc(100vh-10rem)] w-screen max-w-none -translate-x-1/2 bg-white text-neutral-900">
        <BusinessApplyBackground />
        <div className="relative z-10">{children}</div>
      </div>
    </BusinessApplyForceLight>
  );
}
