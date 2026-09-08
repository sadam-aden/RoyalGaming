import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LoginPage } from "./pages/Login/LoginPage";
import { LiveSessionsPage } from "./pages/LiveSessions/LiveSessionsPage";
import { POSPage } from "./pages/POS/POSPage";
import { AnalyticsPage } from "./pages/Analytics/AnalyticsPage";
import { TvDisplayPage } from "./pages/TvDisplay/TvDisplayPage";
import { ExpensesPage } from "./pages/Expenses/ExpensesPage";
import { WeeklyReportPage } from "./pages/Reports/WeeklyReportPage";
import { VatReportPage } from "./pages/Reports/VatReportPage";
import { GeneralReportsPage } from "./pages/Reports/GeneralReportsPage";
import { DiscountsPage } from "./pages/Discounts/DiscountsPage";
import { CustomersPage } from "./pages/Customers/CustomersPage";
import { ProductsAdminPage } from "./pages/Settings/ProductsAdminPage";
import { StaffAdminPage } from "./pages/Settings/StaffAdminPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tv" element={<TvDisplayPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Opened in its own tab from the receipt modal, so it deliberately
              sits outside DashboardLayout — the page is the printable sheet. */}

          <Route element={<DashboardLayout />}>
            <Route index element={<LiveSessionsPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="discounts" element={<DiscountsPage />} />

            <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reports/weekly" element={<WeeklyReportPage />} />
              <Route path="reports/vat" element={<VatReportPage />} />
              <Route path="reports/general" element={<GeneralReportsPage />} />
              <Route path="settings/products" element={<ProductsAdminPage />} />
              <Route path="settings/staff" element={<StaffAdminPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
