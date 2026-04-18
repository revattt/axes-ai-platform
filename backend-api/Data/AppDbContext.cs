using Axes.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Axes.Api.Data
{
    public class AppDbContext : DbContext
    {
        // Constructor that passes connection options to the base class
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // These properties represent your actual SQL Tables
        public DbSet<AppUser> Users { get; set; }
        public DbSet<RfpProject> Projects { get; set; }
    }
}