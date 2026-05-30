import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import SIS from "./pages/SIS";
import ClassStudents from "./pages/ClassStudents";
import StudentProfile from "./pages/StudentProfile";
import IncidentReport from "./pages/IncidentReport";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import CalendarPage from "./pages/CalendarPage";
import Analytics from "./pages/Analytics";
import AuditLogs from "./pages/AuditLogs";
import About from "./pages/About";
import UserManagement from "./pages/UserManagement";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import AIAssistant from "./components/AIAssistant";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const Private = ({ children, roles }: { children: React.ReactNode; roles?: any }) => (
  <ProtectedRoute roles={roles}>{children}</ProtectedRoute>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/" element={<Private><Dashboard /></Private>} />
            <Route path="/sis" element={<Private><SIS /></Private>} />
            <Route path="/sis/class/:classId" element={<Private><ClassStudents /></Private>} />
            <Route path="/sis/student/:studentId" element={<Private><StudentProfile /></Private>} />
            <Route path="/report" element={<Private roles={["teacher", "discipline_staff"]}><IncidentReport /></Private>} />
            <Route path="/reports" element={<Private roles={["dod"]}><Reports /></Private>} />
            <Route path="/notifications" element={<Private><Notifications /></Private>} />
            <Route path="/calendar" element={<Private><CalendarPage /></Private>} />
            <Route path="/analytics" element={<Private roles={["principal", "dos"]}><Analytics /></Private>} />
            <Route path="/audit-logs" element={<Private roles={["principal", "dos", "dod"]}><AuditLogs /></Private>} />
            <Route path="/user-management" element={<Private roles={["principal"]}><UserManagement /></Private>} />
            <Route path="/chat" element={<Private><Chat /></Private>} />
            <Route path="/about" element={<Private><About /></Private>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIAssistant />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
