import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import MuxPlan from './pages/MuxPlan'
import CircuitSearch from './pages/CircuitSearch'
import CircuitRequest from './pages/CircuitRequest'
import WorkOrders from './pages/WorkOrders'
import ModifyCircuit from './pages/ModifyCircuit'
import ActiveCircuits from './pages/ActiveCircuits'
import Maintenance from './pages/Maintenance'
import Reports from './pages/Reports'
import Documents from './pages/Documents'
import Users from './pages/Users'
import Providers from './pages/Providers'
import Diagram from './pages/Diagram'
import Project from './pages/Project'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="mux" element={<MuxPlan />} />
        <Route path="circuits" element={<CircuitSearch />} />
        <Route path="request" element={<CircuitRequest />} />
        <Route path="workorders" element={<WorkOrders />} />
        <Route path="modify" element={<ModifyCircuit />} />
        <Route path="active" element={<ActiveCircuits />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="documents" element={<Documents />} />
        <Route path="users" element={<Users />} />
        <Route path="providers" element={<Providers />} />
        <Route path="diagram" element={<Diagram />} />
        <Route path="project" element={<Project />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
