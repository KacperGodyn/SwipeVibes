using SwipeVibesAPI.Entities;

namespace SwipeVibesAPI.Services;

public class UserService
{
    private readonly List<User> _users = new();
    private int _idCounter = 1;

    public Task<User> RegisterUserAsync(User user)
    {
        user.Id = _idCounter++;
        _users.Add(user);
        return Task.FromResult(user);
    }

    public Task<User> GetUserByIdAsync(int id)
    {
        return Task.FromResult(_users.FirstOrDefault(u => u.Id == id));
    }

    public Task<User> GetUserByUsernameAsync(string username)
    {
        return Task.FromResult(_users.FirstOrDefault(u => u.Username == username));
    }

    public Task<User> GetUserByEmailAsync(string email)
    {
        return Task.FromResult(_users.FirstOrDefault(u => u.Email == email));
    }

    public Task<List<User>> GetUsersAsync()
    {
        return Task.FromResult(_users.ToList());
    }

    public Task<bool> UpdateUserAsync(int id, User updatedUser)
    {
        var user = _users.FirstOrDefault(u => u.Id == id);
        if (user == null) return Task.FromResult(false);

        user.Username = updatedUser.Username;
        user.Email = updatedUser.Email;
        if (!string.IsNullOrEmpty(updatedUser.Password))
            user.Password = updatedUser.Password;
        return Task.FromResult(true);
    }

    public Task<bool> DeleteUserAsync(int id)
    {
        var user = _users.FirstOrDefault(u => u.Id == id);
        if (user == null) return Task.FromResult(false);

        _users.Remove(user);
        return Task.FromResult(true);
    }
}
