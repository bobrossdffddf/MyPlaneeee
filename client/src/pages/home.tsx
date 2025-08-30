import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import PilotDashboard from "@/components/PilotDashboard";
import GroundCrewDashboard from "@/components/GroundCrewDashboard";
import ColumnBasedDashboard from "@/components/ColumnBasedDashboard";
import ChatSidebar from "@/components/ChatSidebar";
import CookieConsent from "@/components/CookieConsent";
import LoginScreen from "@/components/LoginScreen";
import { Button } from "@/components/ui/button";
import { Plane, Users } from "lucide-react";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [userRole, setUserRole] = useState<"pilot" | "crew">("pilot");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Loading PTFS Ground Crew...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <LoginScreen />
        <CookieConsent />
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto bg-background min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Plane className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">PTFS Ground Crew</h1>
            <p className="text-sm text-muted-foreground">Professional Ground Services</p>
          </div>
        </div>
        
        {/* Role Switcher */}
        <div className="flex items-center space-x-3">
          <span className="text-sm text-muted-foreground">View as:</span>
          <div className="flex bg-muted rounded-lg p-1 transition-all duration-200">
            <Button
              variant={userRole === "pilot" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUserRole("pilot")}
              className={`transition-all duration-200 ${userRole === "pilot" ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
              data-testid="button-role-pilot"
            >
              <Plane className="h-4 w-4 mr-2" />
              Pilot
            </Button>
            <Button
              variant={userRole === "crew" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUserRole("crew")}
              className={`transition-all duration-200 ${userRole === "crew" ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
              data-testid="button-role-crew"
            >
              <Users className="h-4 w-4 mr-2" />
              Ground Crew
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                window.location.reload();
              } catch (error) {
                console.error('Logout failed:', error);
                window.location.href = '/';
              }
            }}
            data-testid="button-logout"
          >
            Logout
          </Button>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col transition-all duration-300">
          <div className={`transition-all duration-500 ${userRole === "pilot" ? "opacity-100" : "opacity-100"}`}>
            {userRole === "pilot" ? (
              <PilotDashboard onRequestSelect={setSelectedRequestId} />
            ) : (
              <ColumnBasedDashboard onRequestSelect={setSelectedRequestId} />
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        {selectedRequestId && (
          <ChatSidebar 
            requestId={selectedRequestId} 
            onClose={() => setSelectedRequestId(null)}
          />
        )}
      </div>
    </div>
  );
}
