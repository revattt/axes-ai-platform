namespace Axes.Api.Models
{
    public class RfpProject
    {
        public int Id { get; set; } // Primary Key
        public string ProjectTitle { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;

        public string Priority { get; set; } = "Normal";
        public string Department { get; set; } = "Sales";
        public DateTime UploadDate { get; set; } = DateTime.UtcNow;

        // E.g., "Uploaded", "Processing", "Completed", "Failed"
        public string Status { get; set; } = "Uploaded";

        // How confident the AI was in its extraction (0 to 100)
        public int AiConfidenceScore { get; set; }

        public string? ExtractedJson { get; set; } // The new column!

        // Which user uploaded this? (Foreign Key setup)
        public int UploadedById { get; set; }
        public AppUser? UploadedBy { get; set; }
    }
}