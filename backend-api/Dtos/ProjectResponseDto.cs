namespace Axes.Api.DTOs
{
    public class ProjectResponseDto
    {
        public int Id { get; set; }
        public string ProjectTitle { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public DateTime UploadDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public int AiConfidenceScore { get; set; }

        public string? ExtractedJson { get; set; }

        public string? Priority { get; set; }
        public string? Department { get; set; }
    }
}