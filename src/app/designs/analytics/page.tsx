import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="min-h-full">
      <div className="app-page-header">
        <h1 className="app-page-title">Analytics</h1>
        <p className="app-page-description">
          Track your design usage and performance.
        </p>
      </div>

      <div className="placeholder-page">
        <div className="placeholder-icon">
          <BarChart3 className="size-7" strokeWidth={1.75} aria-hidden />
        </div>
        <h2 className="placeholder-title">Coming soon</h2>
        <p className="placeholder-description">
          Analytics features are under development. Check back later for insights
          into your design usage and exported assets.
        </p>
      </div>
    </div>
  );
}
