import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie, Shield, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent was already given
    const consent = document.cookie.includes('cookie_consent=accepted');
    const urlParams = new URLSearchParams(window.location.search);
    const consentRequired = urlParams.get('consent') === 'required';
    
    if (!consent || consentRequired) {
      setShowConsent(true);
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleConsent = async (consent: boolean) => {
    try {
      await fetch('/api/cookie-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ consent: consent ? 'accept' : 'decline' }),
      });
      
      setIsVisible(false);
      setTimeout(() => setShowConsent(false), 300);
      
      if (consent) {
        // Remove consent parameter from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('consent');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Cookie consent error:', error);
    }
  };

  if (!showConsent) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <Card className="max-w-lg mx-auto shadow-2xl border-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Cookie className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Cookie Consent</h3>
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  PTFS Ground Crew uses essential cookies to maintain your login session and provide secure authentication. 
                  We respect your privacy and only use necessary cookies for the application to function properly.
                </p>
                
                <div className="bg-muted/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-sm">Essential Cookies Only</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Session management for secure login</li>
                    <li>• User authentication state</li>
                    <li>• No tracking or analytics cookies</li>
                  </ul>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleConsent(false)}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                  <Button
                    onClick={() => handleConsent(true)}
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Accept & Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}