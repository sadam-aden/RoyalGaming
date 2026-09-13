import { clsx } from "clsx";
import {
  BarChart3,
  Coffee,
  FileText,
  Gamepad2,
  KeyRound,
  LayoutGrid,
  LogOut,
  Package,
  Percent,
  Receipt,
  TrendingUp,
  Tv,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import { ChangePasswordModal } from "./ChangePasswordModal";

const navItem =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text";
const navItemActive = "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent";

function Item({ to, icon: Icon, label }: { to: string; icon: typeof LayoutGrid; label: string }) {
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  return (
    <NavLink
      to={to}
      end
      onClick={closeSidebar}
      className={({ isActive }) => clsx(navItem, isActive && navItemActive)}
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { sidebarOpen, closeSidebar } = useUiStore();
  const { pathname } = useLocation();

  // Navigating any other way — a redirect, the back button — should not leave
  // the drawer sitting open over the page it moved to.
  useEffect(closeSidebar, [pathname, closeSidebar]);

  return (
    <>
      {/* Below lg the sidebar is a drawer over the page, so it needs something
          to dismiss it. Above lg it is part of the layout and this never
          renders. */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={clsx(
          "flex w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface px-4 py-6",
          // Drawer on small screens, ordinary column from lg up.
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:translate-x-0 lg:transition-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
          <Gamepad2 size={20} />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-text">Royal Gaming</div>
          <div className="text-xs leading-tight text-text-faint">& Cafeteria</div>
        </div>
      </div>

      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-text-faint">Operations</div>
      <nav className="flex flex-col gap-1">
        <Item to="/" icon={LayoutGrid} label="Live Sessions" />
        <Item to="/pos" icon={Coffee} label="POS Terminal" />
        <Item to="/analytics" icon={BarChart3} label="Analytics" />
        <Item to="/customers" icon={Users} label="Customers" />
        <Item to="/discounts" icon={Percent} label="Discount Offers" />
      </nav>

      {isAdmin && (
        <>
          <div className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-wider text-text-faint">
            Finance
          </div>
          <nav className="flex flex-col gap-1">
            <Item to="/expenses" icon={Wallet} label="Expenses" />
            <Item to="/reports/sales" icon={TrendingUp} label="Sales Report" />
            <Item to="/reports/weekly" icon={FileText} label="Weekly Report" />
            <Item to="/reports/vat" icon={Receipt} label="VAT Report" />
            <Item to="/reports/general" icon={FileText} label="General Reports" />
          </nav>

          <div className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-wider text-text-faint">
            Settings
          </div>
          <nav className="flex flex-col gap-1">
            <Item to="/settings/products" icon={Package} label="Products" />
            <Item to="/settings/staff" icon={UserCog} label="Staff" />
          </nav>
        </>
      )}

      <div className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-wider text-text-faint">General</div>
      <nav className="flex flex-col gap-1">
        <a href="/tv" target="_blank" rel="noreferrer" className={navItem}>
          <Tv size={18} />
          TV Display
        </a>
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-border-soft pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-sm font-semibold text-text">
            {user?.name?.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-text">{user?.name}</div>
            <div className="truncate text-xs text-text-faint">{user?.role === "ADMIN" ? "Admin" : "Cashier"}</div>
          </div>
        </div>
        <button onClick={() => setShowChangePassword(true)} className={clsx(navItem, "justify-start")}>
          <KeyRound size={18} />
          Change Password
        </button>
        <button onClick={logout} className={clsx(navItem, "justify-start")}>
          <LogOut size={18} />
          Log out
        </button>
      </div>

        {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      </aside>
    </>
  );
}
