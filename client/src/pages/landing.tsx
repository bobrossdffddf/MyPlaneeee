import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6">
            <Plane className="h-8 w-8 text-primary-foreground" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            PTFS ATC24
          </h1>
          <p className="text-muted-foreground mb-8">
            Ground Crew Coordination System
          </p>
          
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-login"
          >
            Sign In to Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
