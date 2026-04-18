namespace Axes.Api.Models
{
    public class AppUser
    {
        public int Id { get; set; } // Primary Key
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        // We never store plain passwords. We will store a hashed version.
        public string PasswordHash { get; set; } = string.Empty;

        // E.g., "Admin", "BidManager" - useful for Role-Based Access Control
        public string Role { get; set; } = "BidManager";

        // We will use this later for JWT refresh tokens
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime RefreshTokenExpiryTime { get; set; }
    }
}