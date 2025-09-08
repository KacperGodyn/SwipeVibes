using System.ComponentModel.DataAnnotations;

namespace SwipeVibesAPI.Entities;

public class User
{
    public int Id { get; set; }

    [Required]
    [StringLength(50)]
    public string Username { get; set; }

    [Required]
    [StringLength(50)]
    public string Email { get; set; }

    [Required]
    [StringLength(100)]
    public string Password { get; set; }

    [Required]
    [StringLength(30)]
    public string Role { get; set; } = "User";
}
