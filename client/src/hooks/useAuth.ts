import type { User } from "@shared/schema";

// Simple test user for development
const testUser: User = {
  id: "temp-user-123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  profileImageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function useAuth() {
  return {
    user: testUser,
    isLoading: false,
    isAuthenticated: true,
    authError: null,
  };
}