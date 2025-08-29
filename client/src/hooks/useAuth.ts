// No authentication - just return a test user so app works
const testUser = {
  id: "temp-user-123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  profileImageUrl: null,
};

export function useAuth() {
  return {
    user: testUser,
    isLoading: false,
    isAuthenticated: true,
  };
}
