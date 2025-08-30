import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ServiceRequestCard from "./ServiceRequestCard";
import type { ServiceRequest, Airport } from "@shared/schema";

interface GroundCrewDashboardProps {
  onRequestSelect: (requestId: string) => void;
}

export default function GroundCrewDashboard({ onRequestSelect }: GroundCrewDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAirport, setSelectedAirport] = useState<string>("IBAR");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  // Fetch airports
  const { data: airports = [] } = useQuery<Airport[]>({
    queryKey: ["/api/airports"],
  });

  // Fetch open requests
  const { data: openRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/requests/open", selectedAirport],
  });

  // Fetch my claimed/active requests
  const { data: myRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/requests", "crew", user?.id],
    enabled: !!user?.id,
  });

  // Claim request mutation
  const claimMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/requests/${requestId}/claim`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Request Claimed",
        description: "You have successfully claimed the service request.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to claim request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message) => {
      if (message.type === "new_request" || message.type === "request_claimed") {
        queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      }
    },
  });

  const selectedAirportName = airports.find(a => a.icao === selectedAirport)?.name || "";

  const filteredOpenRequests = openRequests.filter(req => {
    if (serviceFilter === "all") return true;
    return req.serviceType === serviceFilter;
  });

  const activeRequests = myRequests.filter(req => ["claimed", "in_progress"].includes(req.status));

  return (
    <div className="flex-1 p-6">
      {/* Header and Controls */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Ground Services Hub</h2>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Active Ground Crew</span>
            </div>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-48" data-testid="select-service-filter">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectItem value="all">🔄 All Services</SelectItem>
                <SelectItem value="fuel">⛽ Fuel Service</SelectItem>
                <SelectItem value="catering">🍽️ Catering</SelectItem>
                <SelectItem value="baggage">🧳 Baggage Handling</SelectItem>
                <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                <SelectItem value="pushback">🚛 Pushback</SelectItem>
                <SelectItem value="ground_power">🔌 Ground Power</SelectItem>
                <SelectItem value="cleaning">🧽 Cleaning</SelectItem>
                <SelectItem value="lavatory">🚽 Lavatory Service</SelectItem>
                <SelectItem value="de_icing">❄️ De-icing</SelectItem>
                <SelectItem value="cargo_handling">📦 Cargo Handling</SelectItem>
                <SelectItem value="passenger_boarding">👥 Passenger Boarding</SelectItem>
                <SelectItem value="aircraft_parking">🅿️ Aircraft Parking</SelectItem>
                <SelectItem value="towing">🔗 Aircraft Towing</SelectItem>
                <SelectItem value="air_conditioning">🌡️ Air Conditioning</SelectItem>
                <SelectItem value="water_service">💧 Water Service</SelectItem>
                <SelectItem value="waste_removal">🗑️ Waste Removal</SelectItem>
                <SelectItem value="security_check">🔒 Security Check</SelectItem>
                <SelectItem value="customs_clearance">📋 Customs Clearance</SelectItem>
                <SelectItem value="medical_assistance">🏥 Medical Assistance</SelectItem>
                <SelectItem value="special_assistance">♿ Special Assistance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Airport Filter */}
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-foreground">Airport:</label>
            <Select value={selectedAirport} onValueChange={setSelectedAirport}>
              <SelectTrigger className="min-w-32" data-testid="select-airport-crew">
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

      {/* Available Requests Grid */}
      {filteredOpenRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-foreground mb-4">Open Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOpenRequests.map((request) => (
              <ServiceRequestCard
                key={request.id}
                request={request}
                userRole="crew"
                onClaim={() => claimMutation.mutate(request.id)}
                isClaimPending={claimMutation.isPending}
                onSelect={onRequestSelect}
                data-testid={`card-request-${request.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* My Active Requests */}
      {activeRequests.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">My Active Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeRequests.map((request) => (
              <ServiceRequestCard
                key={request.id}
                request={request}
                userRole="crew"
                onSelect={onRequestSelect}
                isActive={true}
                data-testid={`card-active-request-${request.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {filteredOpenRequests.length === 0 && activeRequests.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg" data-testid="text-no-requests">
            No service requests available at {selectedAirport}
          </p>
        </div>
      )}
    </div>
  );
}
