import { Outlet } from "react-router-dom";
import { TopicSidebar } from "./components/TopicSidebar";

export function AbstractTopicPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex flex-col md:flex-row">
        <TopicSidebar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AbstractTopicPage;
