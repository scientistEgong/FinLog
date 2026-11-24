// Keep route selection separate from page implementation so unfinished phases remain visible as stubs.
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ComingSoon from "./components/ComingSoon.jsx";
import Transactions from "./pages/Transactions.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Switch this redirect to /dashboard once the dashboard exists (Phase 3). */}
        <Route path="/" element={<Navigate to="/transactions" replace />} />
        <Route path="/dashboard" element={<ComingSoon name="Dashboard" phase={3} />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<ComingSoon name="Budgets" phase={3} />} />
        <Route path="/analytics" element={<ComingSoon name="Analytics" phase={4} />} />
        <Route path="/loans" element={<ComingSoon name="Loans" phase={4} />} />
        <Route path="/reports" element={<ComingSoon name="Reports" phase={5} />} />
        <Route path="*" element={<Navigate to="/transactions" replace />} />
      </Routes>
    </Layout>
  );
}
