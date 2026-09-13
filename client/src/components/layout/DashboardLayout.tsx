import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <Sidebar />
      {/* min-w-0 so a wide child — a table, a chart — is bounded by the main
          column and scrolls inside it, instead of stretching the flex row and
          pushing the whole page sideways. */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
