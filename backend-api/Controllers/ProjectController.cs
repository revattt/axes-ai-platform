using Axes.AiService.Hubs;
using Axes.Api.Data;
using Axes.Api.DTOs;
using Axes.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Axes.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // <--- This protects every endpoint in this file!
    public class ProjectController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<ProjectHub> _hubContext;

        public ProjectController(AppDbContext context, IServiceScopeFactory scopeFactory, IHubContext<ProjectHub> hubContext)
        {
            _context = context;
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
        }

        // Helper method to securely get the user ID from their JWT Token
        private int GetUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(userIdString!);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadRfp([FromForm] string title, [FromForm] string? priority, [FromForm] string? department, IFormFile file)
        {
            var priorityFromAngular = Request.Form["priority"].ToString();
            var departmentFromAngular = Request.Form["department"].ToString();

            if (string.IsNullOrEmpty(priorityFromAngular)) priorityFromAngular = "Normal";
            if (string.IsNullOrEmpty(departmentFromAngular)) departmentFromAngular = "Sales";

            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            // 1. Save the file to your physical folder (keep your existing file saving logic here)
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", file.FileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }



            // 2. Save the initial "Processing" state to the Database
            var newProject = new RfpProject
            {
                ProjectTitle = title,
                Priority = priorityFromAngular,
                Department = departmentFromAngular,
                OriginalFileName = file.FileName,
                UploadDate = DateTime.UtcNow,
                Status = "Processing", // Instantly show as processing!
                UploadedById = GetUserId()
            };

            _context.Projects.Add(newProject);
            await _context.SaveChangesAsync();
            var projectId = newProject.Id;

            // 3. FIRE AND FORGET: Spin up a background thread for the AI
            _ = Task.Run(async () =>
            {
                // Create a fresh "backpack" for the background thread to use the database safely
                using var scope = _scopeFactory.CreateScope();
                var backgroundContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var hub = scope.ServiceProvider.GetRequiredService<IHubContext<ProjectHub>>();

                try
                {
                    using var client = new HttpClient();
                    using var content = new MultipartFormDataContent();
                    var fileContent = new ByteArrayContent(System.IO.File.ReadAllBytes(filePath));
                    content.Add(fileContent, "file", file.FileName);

                    // WATCH THE EXACT ROUTE NAME HERE! No trailing slash!
                    var pythonResponse = await client.PostAsync("http://127.0.0.1:8000/api/extract", content);

                    var projectToUpdate = await backgroundContext.Projects.FindAsync(projectId);
                    if (projectToUpdate != null)
                    {
                        if (pythonResponse.IsSuccessStatusCode)
                        {
                            var jsonResult = await pythonResponse.Content.ReadAsStringAsync();
                            projectToUpdate.ExtractedJson = jsonResult;
                            projectToUpdate.Status = "Completed";

                            using var doc = System.Text.Json.JsonDocument.Parse(jsonResult);
                            if (doc.RootElement.TryGetProperty("ai_confidence_score", out var scoreElement))
                            {
                                projectToUpdate.AiConfidenceScore = scoreElement.GetInt32();
                            }
                        }
                        else
                        {
                            // ENTERPRISE FIX: If Python crashes or 404s, mark it as Failed!
                            projectToUpdate.Status = "Failed";
                            Console.WriteLine($"[AI ERROR] Python returned: {pythonResponse.StatusCode}");
                        }

                        await backgroundContext.SaveChangesAsync();

                        // BLAST THE SIGNAL TO ANGULAR NO MATTER WHAT (Success or Failure!)
                        await hub.Clients.All.SendAsync("ExtractionComplete");
                    }
                }
                catch (Exception ex)
                {
                    // If the entire background thread violently crashes, try to update the DB one last time
                    var projectToUpdate = await backgroundContext.Projects.FindAsync(projectId);
                    if (projectToUpdate != null)
                    {
                        projectToUpdate.Status = "Failed";
                        await backgroundContext.SaveChangesAsync();
                        await hub.Clients.All.SendAsync("ExtractionComplete");
                    }
                    Console.WriteLine($"Background AI Task Crashed: {ex.Message}");
                }
            });

            // 5. Instantly return Success to Angular, freeing up the browser!
            return Ok(new { message = "Upload received. AI Extraction initialized." });
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRfp(int id)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var project = await _context.Projects.FindAsync(id);

            // Security check: Make sure it exists AND belongs to this user!
            if (project == null || project.UploadedById != userId) return NotFound();

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Document securely deleted." });
        }

        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetProjects()
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var projects = await _context.Projects
                .Where(p => p.UploadedById == userId)
                .OrderByDescending(p => p.UploadDate)
                .ToListAsync();

            return Ok(projects);
        }

        [Authorize]
    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics()
    {
        // 1. Get the current logged-in user
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
            return Unauthorized(new { message = "Invalid token credentials." });

        // 2. Fetch only THEIR projects
        var projects = await _context.Projects.Where(p => p.UploadedById == userId).ToListAsync();
        var completedProjects = projects.Where(p => p.Status == "Completed").ToList();

        // 3. Calculate Real Statistics
        var totalDocuments = projects.Count;
        var autoApproved = completedProjects.Count(p => p.AiConfidenceScore >= 90);
        var needsReview = completedProjects.Count(p => p.AiConfidenceScore >= 70 && p.AiConfidenceScore < 90);
        var criticalManual = completedProjects.Count(p => p.AiConfidenceScore < 70);
        
        var avgConfidence = completedProjects.Any() 
            ? Math.Round(completedProjects.Average(p => p.AiConfidenceScore), 1) 
            : 0;

        // 4. Send the structured telemetry payload back to Angular
        return Ok(new
        {
            totalDocuments = totalDocuments,
            avgConfidence = avgConfidence,
            // Replace statusCounts with triageCounts
            triageCounts = new[] { autoApproved, needsReview, criticalManual }, 
            trendScores = new[] { 75, 82, 80, 88, 85, 92, avgConfidence },
            trendDates = new[] { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today" }
        });
    }
        [Authorize]
        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> GetPdf(int id)
        {
            // 1. Find the project in the database
            var project = await _context.Projects.FindAsync(id);
            if (project == null) return NotFound();

            // 2. Locate the physical file on the server
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", project.OriginalFileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound(new { message = "Physical file not found on server." });

            // 3. Read the file into memory
            var memory = new MemoryStream();
            using (var stream = new FileStream(filePath, FileMode.Open))
            {
                await stream.CopyToAsync(memory);
            }
            memory.Position = 0;

            // 4. Send it back as an official PDF file stream
            return File(memory, "application/pdf", project.OriginalFileName);
        }
    }


}