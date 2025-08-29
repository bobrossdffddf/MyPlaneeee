import { useQuery } from "@tanstack/react-query";

// Mock user for testing without authentication
const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  profileImageUrl: null,
};

export function useAuth() {
  // For now, bypass authentication and return mock user
  return {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
  };
}
