import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ServiceRequestCard from "./ServiceRequestCard";
import NewRequestDialog from "./NewRequestDialog";
import type { ServiceRequest, Airport } from "@shared/schema";

interface PilotDashboardProps {
  onRequestSelect: (requestId: string) => void;
}

export default function PilotDashboard({ onRequestSelect }: PilotDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAirport, setSelectedAirport] = useState<string>("KJFK");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);

  // Fetch airports
  const { data: airports = [] } = useQuery<Airport[]>({
    queryKey: ["/api/airports"],
  });

  // Fetch pilot's requests
  const { data: myRequests = [], isLoading: isLoadingMyRequests } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/requests", "pilot", user?.id],
    enabled: !!user?.id,
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message) => {
      if (message.type === "request_claimed" || message.type === "request_status_updated") {
        queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      }
    },
  });

  const selectedAirportName = airports.find(a => a.icao === selectedAirport)?.name || "";

  const openRequests = myRequests.filter(req => req.status === "open");
  const activeRequests = myRequests.filter(req => ["claimed", "in_progress"].includes(req.status));
  const completedRequests = myRequests.filter(req => req.status === "completed");

  return (
    <div className="flex-1 p-6">
      {/* Header and Controls */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Request Ground Services</h2>
          <Button 
            onClick={() => setShowNewRequestDialog(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-new-request"
          >
            + New Request
          </Button>
        </div>
        
        {/* Airport Filter */}
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-foreground">Airport:</label>
            <Select value={selectedAirport} onValueChange={setSelectedAirport}>
              <SelectTrigger className="min-w-32" data-testid="select-airport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {airports.map((airport) => (
                  <SelectItem key={airport.icao} value={airport.icao}>
                    {airport.icao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1"></div>
            <span className="text-sm text-muted-foreground" data-testid="text-monitoring-airport">
              Monitoring {selectedAirport}
            </span>
          </div>
        </Card>
      </div>

      {/* Open Requests */}
      {openRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-foreground mb-4">Pending Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openRequests.map((request) => (
              <ServiceRequestCard
                key={request.id}
                request={request}
                userRole="pilot"
                onSelect={onRequestSelect}
                data-testid={`card-request-${request.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-foreground mb-4">Active Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeRequests.map((request) => (
              <ServiceRequestCard
                key={request.id}
                request={request}
                userRole="pilot"
                onSelect={onRequestSelect}
                data-testid={`card-request-${request.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Requests */}
      {completedRequests.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Recent Completed</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedRequests.slice(0, 6).map((request) => (
              <ServiceRequestCard
                key={request.id}
                request={request}
                userRole="pilot"
                onSelect={onRequestSelect}
                data-testid={`card-request-${request.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {myRequests.length === 0 && !isLoadingMyRequests && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg" data-testid="text-no-requests">
            No service requests yet. Create your first request!
          </p>
        </div>
      )}

      <NewRequestDialog
        open={showNewRequestDialog}
        onOpenChange={setShowNewRequestDialog}
        selectedAirport={selectedAirport}
        airports={airports}
      />
    </div>
  );
}
