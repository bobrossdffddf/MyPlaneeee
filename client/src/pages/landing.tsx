import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6">
            <Plane className="h-8 w-8 text-primary-foreground" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            PTFS Ground Crew
          </h1>
          <p className="text-muted-foreground mb-8">
            Professional Ground Services Coordination
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-login"
            >
              <Plane className="mr-2 h-4 w-4" />
              Sign In with Replit
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/api/discord/login'}
              className="w-full bg-[#5865f2] hover:bg-[#5865f2]/90 text-white"
              data-testid="button-discord-login"
            >
              <Users className="mr-2 h-4 w-4" />
              Sign In with Discord
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
