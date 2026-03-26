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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/sis" element={<SIS />} />
          <Route path="/sis/class/:classId" element={<ClassStudents />} />
          <Route path="/sis/student/:studentId" element={<StudentProfile />} />
          <Route path="/report" element={<IncidentReport />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
