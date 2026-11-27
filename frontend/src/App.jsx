// ============================================================
// 1. Imports and page dependencies
// ============================================================
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ComingSoon from "./components/ComingSoon.jsx";
import Budgets from "./pages/Budgets.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Transactions from "./pages/Transactions.jsx";

const Analytics = lazy(() => import("./pages/Analytics.jsx"));

// ============================================================
// 2. Match URLs to implemented pages or planned-feature stubs
// ============================================================
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route
          path="/analytics"
          element={(
            <Suspense fallback={<p className="muted">Loading analytics…</p>}>
              <Analytics />
            </Suspense>
          )}
        />
        <Route path="/loans" element={<ComingSoon name="Loans" phase={5} />} />
        <Route path="/reports" element={<ComingSoon name="Reports" phase={6} />} />
        <Route path="*" element={<Navigate to="/transactions" replace />} />
      </Routes>
    </Layout>
  );
}
