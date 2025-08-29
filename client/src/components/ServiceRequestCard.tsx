import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";
import type { ServiceRequest } from "@shared/schema";

interface ServiceRequestCardProps {
  request: ServiceRequest;
  userRole: "pilot" | "crew";
  onSelect: (requestId: string) => void;
  onClaim?: () => void;
  isClaimPending?: boolean;
  isActive?: boolean;
}

const serviceIcons: Record<string, string> = {
  fuel: "⛽",
  catering: "🍽️",
  baggage: "🧳",
  maintenance: "🔧",
  pushback: "🚛",
  ground_power: "🔌",
  cleaning: "🧽",
  lavatory: "🚽",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-500",
  claimed: "bg-yellow-500",
  in_progress: "bg-orange-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  claimed: "Claimed", 
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ServiceRequestCard({
  request,
  userRole,
  onSelect,
  onClaim,
  isClaimPending,
  isActive,
}: ServiceRequestCardProps) {
  const { toast } = useToast();

  const completeRequestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/requests/${request.id}/status`, {
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Request Completed",
        description: "Service request has been marked as completed.",
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
        description: "Failed to complete request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const canChat = request.status === "claimed" || request.status === "in_progress";
  const canComplete = userRole === "crew" && (request.status === "claimed" || request.status === "in_progress");

  return (
    <Card 
      className={`transition-all duration-200 hover:-translate-y-1 cursor-pointer ${
        isActive ? "border-2 border-primary/50" : ""
      }`}
      onClick={() => canChat && onSelect(request.id)}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 ${getServiceColor(request.serviceType)}/20 rounded-lg flex items-center justify-center`}>
              <span className="text-2xl">
                {serviceIcons[request.serviceType] || "📋"}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground capitalize">
                {request.serviceType.replace("_", " ")}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid={`text-gate-flight-${request.id}`}>
                {request.gate} • {request.flightNumber}
              </p>
            </div>
          </div>
          <Badge 
            className={`${statusColors[request.status]} text-white text-xs`}
            data-testid={`badge-status-${request.id}`}
          >
            {statusLabels[request.status]}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4" data-testid={`text-description-${request.id}`}>
          {request.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground" data-testid={`text-time-${request.id}`}>
            {request.createdAt ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true }) : "Just now"}
          </span>
          
          <div className="flex space-x-2">
            {userRole === "crew" && request.status === "open" && onClaim && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClaim();
                }}
                disabled={isClaimPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid={`button-claim-${request.id}`}
              >
                {isClaimPending ? "Claiming..." : "Claim Request"}
              </Button>
            )}
            
            {canChat && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(request.id);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid={`button-chat-${request.id}`}
              >
                Open Chat
              </Button>
            )}
            
            {canComplete && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  completeRequestMutation.mutate();
                }}
                disabled={completeRequestMutation.isPending}
                className="bg-green-500 hover:bg-green-600 text-white"
                data-testid={`button-complete-${request.id}`}
              >
                {completeRequestMutation.isPending ? "Completing..." : "Complete"}
              </Button>
            )}
            
            {request.status === "completed" && (
              <span className="text-green-500 text-sm font-medium">
                ✓ Complete
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getServiceColor(serviceType: string): string {
  const colors: Record<string, string> = {
    fuel: "bg-blue-500",
    catering: "bg-green-500",
    baggage: "bg-purple-500",
    maintenance: "bg-red-500",
    pushback: "bg-indigo-500",
    ground_power: "bg-yellow-500",
    cleaning: "bg-teal-500",
    lavatory: "bg-pink-500",
  };
  return colors[serviceType] || "bg-gray-500";
}
