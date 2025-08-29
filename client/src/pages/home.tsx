import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import PilotDashboard from "@/components/PilotDashboard";
import GroundCrewDashboard from "@/components/GroundCrewDashboard";
import ChatSidebar from "@/components/ChatSidebar";
import { Button } from "@/components/ui/button";
import { Plane, Users } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<"pilot" | "crew">("pilot");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto bg-background min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">ATC</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">PTFS ATC24</h1>
            <p className="text-sm text-muted-foreground">Ground Crew Coordination</p>
          </div>
        </div>
        
        {/* Role Switcher */}
        <div className="flex items-center space-x-3">
          <span className="text-sm text-muted-foreground">Role:</span>
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={userRole === "pilot" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUserRole("pilot")}
              className={userRole === "pilot" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"}
              data-testid="button-role-pilot"
            >
              <Plane className="h-4 w-4 mr-2" />
              Pilot
            </Button>
            <Button
              variant={userRole === "crew" ? "default" : "ghost"}
              size="sm"
              onClick={() => setUserRole("crew")}
              className={userRole === "crew" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"}
              data-testid="button-role-crew"
            >
              <Users className="h-4 w-4 mr-2" />
              Ground Crew
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/api/logout'}
            data-testid="button-logout"
          >
            Logout
          </Button>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {userRole === "pilot" ? (
            <PilotDashboard onRequestSelect={setSelectedRequestId} />
          ) : (
            <GroundCrewDashboard onRequestSelect={setSelectedRequestId} />
          )}
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
