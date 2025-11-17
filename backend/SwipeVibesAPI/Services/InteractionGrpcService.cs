using Grpc.Core;
using SwipeVibesAPI.Grpc;
using SwipeVibesAPI.Services;

public class InteractionGrpcService : InteractionService.InteractionServiceBase
{
    private readonly FirestoreService _fs;
    private readonly IHttpContextAccessor _ctx;

    public InteractionGrpcService(FirestoreService fs, IHttpContextAccessor ctx)
    {
        _fs = fs; _ctx = ctx;
    }

    public override async Task<LogReply> Log(LogRequest request, ServerCallContext context)
    {
        var http = context.GetHttpContext();
        var isAuth = http?.User?.Identity?.IsAuthenticated == true;
        if (!isAuth)
        {
            return new LogReply { Ok = true, Id = "" };
        }

        var userId = http!.User!.Identity!.Name!;
        var doc = new InteractionDoc
        {
            UserId = userId,
            Isrc = request.Isrc,
            Decision = request.Decision.ToLowerInvariant(),
            DeezerTrackId = request.DeezerTrackId == 0 ? null : request.DeezerTrackId,
            Source = request.Source,
            PreviewUrl = request.PreviewUrl,
            Artist = request.Artist,
            Title = request.Title
        };

        var added = await _fs.AddInteractionAsync(doc);
        return new LogReply { Ok = true, Id = added.Id };
    }
}
