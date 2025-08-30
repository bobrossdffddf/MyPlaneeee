export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message) || 
         error.message.includes("Unauthorized") ||
         error.message.includes("401");
}

export function handleAuthError(error: Error, toast: any) {
  if (isUnauthorizedError(error)) {
    toast({
      title: "Session Expired",
      description: "Please sign in again to continue.",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/";
    }, 1000);
    return true;
  }
  return false;
}

export function getAuthRedirectUrl(): string {
  // Check if Discord is available
  const isDiscordAuth = window.location.search.includes('discord=true');
  return isDiscordAuth ? '/api/discord/login' : '/api/login';
}