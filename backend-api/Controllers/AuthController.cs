using Axes.Api.Data;
using Axes.Api.DTOs;
using Axes.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Axiom.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        // Dependency Injection: We inject the Database and Configuration (appsettings.json)
        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AppUser>> Register(UserRegisterDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "All fields are strictly required." });
            }
            // 1. Check if user exists
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            {
                return BadRequest("Username already exists.");
            }

            // 2. Hash the password using BCrypt
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // 3. Create the user model
            var user = new AppUser
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = passwordHash,
                Role = "BidManager" // Default role
            };

            // 4. Save to SQL Database
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok("User successfully registered.");
        }

        [HttpPost("login")]
        public async Task<ActionResult<string>> Login(UserLoginDto request)
        {
            // 1. Find the user in the database
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            if (user == null)
            {
                return BadRequest("User not found.");
            }

            // 2. Verify the hashed password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest("Wrong password.");
            }

            // 3. If correct, generate the JWT token
            string token = CreateToken(user);

            return Ok(token);
        }

        // Private helper method to construct the actual JWT
        private string CreateToken(AppUser user)
        {
            // The "Claims" are the data embedded inside the token (like an ID card)
            List<Claim> claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
            };

            // Get the secret key from appsettings.json
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration.GetSection("AppSettings:Token").Value!));

            // Generate the digital signature
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            // Construct the token
            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddDays(1), // Token valid for 1 day
                signingCredentials: creds
            );

            // Serialize it into a string so it can be sent to the frontend
            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            return jwt;
        }

        [Authorize] // This locks the door. Only valid JWT tokens can enter!
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            // Extract the User ID directly from the secure JWT Token
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
                return Unauthorized(new { message = "Invalid token credentials." });

            // Find the user in the database
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            // Return safe data only (NEVER return the password hash!)
            return Ok(new
            {
                username = user.Username,
                email = user.Email,
                role = user.Role,
                // If you have a JoinDate column, you could add it here!
            });
        }
    }
}