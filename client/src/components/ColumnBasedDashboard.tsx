import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, MapPin, User, MessageSquare, CheckCircle, AlertCircle, PlayCircle, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ServiceRequest, Airport } from "@shared/schema";
import { format } from "date-fns";

interface ColumnBasedDashboardProps {
  onRequestSelect: (requestId: string) => void;
}

const serviceIcons: Record<string, string> = {
  fuel: "⛽",
  fuel_full_service: "🚛",
  gpu_connection: "🔌",
  apu_connection: "⚡",
  air_conditioning_ground: "❄️",
  baggage_loading: "🧳",
  baggage_unloading: "📤",
  cargo_loading: "📦",
  cargo_unloading: "📋",
  catering_full_service: "🍽️",
  catering_beverage_only: "☕",
  catering_meal_service: "🥘",
  maintenance_line: "🔧",
  maintenance_heavy: "🔨",
  maintenance_inspection: "🔍",
  cleaning_cabin_full: "🧽",
  cleaning_cabin_light: "✨",
  cleaning_exterior: "💦",
  pushback: "🚛",
  pushback_with_start: "🚀",
  towing_to_gate: "🔗",
  towing_to_maintenance: "🛠️",
  security_check: "🔒",
  passenger_boarding: "👥",
  passenger_deboarding: "👤",
  passenger_special_assistance: "♿",
  de_icing: "❄️",
  anti_icing: "🧊",
  lavatory_service: "🚽",
  water_service_potable: "💧",
  water_service_gray: "💨",
  stairs_positioning: "🪜",
  stairs_removal: "📤",
  jetbridge_connection: "🌉",
  jetbridge_disconnection: "🔌",
  marshalling_arrival: "👋",
  marshalling_departure: "👋",
  customs_inspection: "📋",
  immigration_check: "🛂",
  ground_transport_crew: "🚌",
  ground_transport_passenger: "🚐",
  wheelchair_assistance: "♿",
  special_cargo_handling: "📦",
  dangerous_goods_handling: "⚠️",
  live_animals_handling: "🐕",
  engine_start_assistance: "🚀",
  pre_flight_inspection: "✅",
  post_flight_inspection: "📋",
  walk_around_inspection: "👀",
  tire_pressure_check: "🛞",
  oil_service: "🛢️",
  hydraulic_service: "💧",
  nitrogen_service_tires: "💨",
  oxygen_service_crew: "🫁",
  cabin_service_supplies: "🧴",
  galley_service_full: "🍴",
  galley_restocking: "📦",
  emergency_equipment_check: "🚨",
  life_vest_check: "🦺",
  fire_extinguisher_check: "🧯",
  cargo_documentation: "📄",
  weight_balance_calculation: "⚖️",
  flight_planning_support: "🗺️",
  meteorological_briefing: "🌤️",
  crew_transport_hotel: "🏨",
  crew_briefing_room: "👨‍✈️",
  aircraft_parking_overnight: "🅿️",
  aircraft_parking_transit: "🔄",
  hangar_service_maintenance: "🏢",
  hangar_service_storage: "📦",
  ramp_coordination: "📡",
  slot_coordination: "⏰",
  customs_clearance: "✅",
  immigration_processing: "🛂",
};

export default function ColumnBasedDashboard({ onRequestSelect }: ColumnBasedDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAirport, setSelectedAirport] = useState<string>("IRFD");

  // Fetch airports
  const { data: airports = [] } = useQuery<Airport[]>({
    queryKey: ["/api/airports"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/airports");
      return response;
    },
  });

  // Fetch all requests for selected airport
  const { data: allRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/requests/open", selectedAirport],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/requests/open/${selectedAirport}`);
      return response;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch my requests as crew member
  const { data: myRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/requests/crew", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/requests/crew/${user.id}`);
      return response;
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Claim request mutation
  const claimMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/requests/${requestId}/claim`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "🚀 Request Claimed!",
        description: "You can now start working on this service request.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Claim Failed",
        description: error.message || "This request may have already been claimed.",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  // Complete request mutation
  const completeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/requests/${requestId}/status`, {
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "✅ Service Completed!",
        description: "Request has been marked as completed successfully.",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Update Failed",
        description: error.message || "Failed to update request status.",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message) => {
      if (message.type === "new_request" || message.type === "request_claimed" || message.type === "request_status_updated") {
        queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      }
    },
  });

  // Organize requests by status
  const organizedRequests = useMemo(() => {
    const allRequestsArray = Array.isArray(allRequests) ? allRequests : [];
    const myRequestsArray = Array.isArray(myRequests) ? myRequests : [];
    const combined = [...allRequestsArray, ...myRequestsArray];
    const unique = Array.from(new Map(combined.map(r => [r.id, r])).values());

    return {
      unclaimed: unique.filter(r => r.status === "open"),
      inProgress: unique.filter(r => ["claimed", "in_progress"].includes(r.status)),
      completed: unique.filter(r => r.status === "completed"),
    };
  }, [allRequests, myRequests]);

  const RequestCard = ({ request }: { request: ServiceRequest }) => {
    const isMyRequest = request.groundCrewId === user?.id;
    const canClaim = request.status === "open" && !isMyRequest;
    const canComplete = isMyRequest && ["claimed", "in_progress"].includes(request.status);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Card className={`mb-3 transition-all duration-200 hover:shadow-lg cursor-pointer border-l-4 ${
          isMyRequest ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-l-blue-500'
        }`}
        onClick={() => onRequestSelect(request.id)}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="text-2xl p-2 bg-primary/10 rounded-lg">
                  {serviceIcons[request.serviceType] || "🔧"}
                </div>
                <div>
                  <h3 className="font-bold text-sm capitalize leading-tight">
                    {request.serviceType.replace(/_/g, " ")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {request.flightNumber} • Gate {request.gate}
                  </p>
                </div>
              </div>
              {isMyRequest && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  My Request
                </Badge>
              )}
            </div>

            <div className="space-y-2 mb-3 text-xs">
              <div className="flex items-center text-muted-foreground">
                <MapPin className="w-3 h-3 mr-2" />
                <span>{request.airportIcao}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-3 h-3 mr-2" />
                <span>{request.createdAt ? format(new Date(request.createdAt), "HH:mm") : "--:--"}</span>
              </div>
              {request.aircraft && (
                <div className="flex items-center text-muted-foreground">
                  <Plane className="w-3 h-3 mr-2" />
                  <span>{request.aircraft}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
              {request.description}
            </p>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestSelect(request.id);
                }}
                className="text-xs h-7 px-2"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Chat
              </Button>
              
              <div className="flex space-x-1">
                {canClaim && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      claimMutation.mutate(request.id);
                    }}
                    disabled={claimMutation.isPending}
                    className="text-xs h-7 px-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {claimMutation.isPending ? "..." : "Claim"}
                  </Button>
                )}
                
                {canComplete && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      completeMutation.mutate(request.id);
                    }}
                    disabled={completeMutation.isPending}
                    className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700"
                  >
                    {completeMutation.isPending ? "..." : "Complete"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const Column = ({ 
    title, 
    requests, 
    icon, 
    color,
    emptyMessage 
  }: { 
    title: string; 
    requests: ServiceRequest[]; 
    icon: any;
    color: string;
    emptyMessage: string;
  }) => {
    const Icon = icon;
    return (
      <div className="flex-1 min-w-0">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-base font-bold">{title}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {requests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 max-h-[calc(100vh-300px)] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              ) : (
                requests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-foreground">Ground Services Control</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates Active</span>
            </div>
            <Select value={selectedAirport} onValueChange={setSelectedAirport}>
              <SelectTrigger className="w-32" data-testid="select-airport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(airports) && airports.map((airport: Airport) => (
                  <SelectItem key={airport.icao} value={airport.icao}>
                    {airport.icao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <Column 
          title="Available Requests" 
          requests={organizedRequests.unclaimed}
          icon={AlertCircle}
          color="text-amber-600"
          emptyMessage="No pending requests at this airport"
        />
        <Column 
          title="In Progress" 
          requests={organizedRequests.inProgress}
          icon={PlayCircle}
          color="text-blue-600"
          emptyMessage="No active service requests"
        />
        <Column 
          title="Completed" 
          requests={organizedRequests.completed}
          icon={CheckCircle}
          color="text-green-600"
          emptyMessage="No completed requests"
        />
      </div>
    </div>
  );
}