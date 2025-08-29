import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";
import type { ServiceRequest, ChatMessage } from "@shared/schema";

interface ChatSidebarProps {
  requestId: string;
  onClose: () => void;
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

export default function ChatSidebar({ requestId, onClose }: ChatSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch request details
  const { data: request } = useQuery<ServiceRequest>({
    queryKey: ["/api/requests", requestId],
    enabled: !!requestId,
  });

  // Fetch chat messages
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/requests", requestId, "messages"],
    enabled: !!requestId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", `/api/requests/${requestId}/messages`, {
        message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId, "messages"] });
      setNewMessage("");
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
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // WebSocket for real-time messages
  useWebSocket({
    onMessage: (message) => {
      if (message.type === "new_message" && message.data.requestId === requestId) {
        queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId, "messages"] });
      }
    },
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  if (!request) {
    return null;
  }

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span className="text-xl">
                {serviceIcons[request.serviceType] || "📋"}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-foreground capitalize" data-testid="text-chat-service">
                {request.serviceType.replace("_", " ")} - {request.gate}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid="text-chat-flight">
                {request.flightNumber}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {request.status === "claimed" && messages.length === 0 && (
            <div className="text-center">
              <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                Request claimed - Chat is now active
              </span>
            </div>
          )}

          {messages.map((message) => {
            const isOwnMessage = message.userId === user?.id;
            return (
              <div 
                key={message.id} 
                className={`flex items-start space-x-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground">
                  {isOwnMessage ? "You" : "GC"}
                </div>
                <div className="flex-1">
                  <div className={`rounded-lg p-3 ${
                    isOwnMessage 
                      ? "bg-primary text-primary-foreground ml-auto max-w-xs" 
                      : "bg-muted text-foreground"
                  }`}>
                    <p className="text-sm" data-testid={`message-${message.id}`}>
                      {message.message}
                    </p>
                  </div>
                  <div className={isOwnMessage ? "text-right" : ""}>
                    <span className="text-xs text-muted-foreground mt-1">
                      {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) : "Just now"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Chat Input */}
      {(request.status === "claimed" || request.status === "in_progress") && (
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-input border-border"
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button 
              type="submit"
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-send-message"
            >
              Send
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
