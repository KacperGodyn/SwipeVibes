public enum ExplicitLevel { Unspecified = 0, Clean = 1, Explicit = 2 }

public class Track
{
    public long Id { get; set; }
    public string Title { get; set; } = null!;
    public string? TitleShort { get; set; }
    public string? Isrc { get; set; }
    public string? Link { get; set; }
    public string? Share { get; set; }
    public int TrackPosition { get; set; }
    public int DiskNumber { get; set; }
    public int Rank { get; set; }
    public DateOnly? ReleaseDate { get; set; }
    public bool ExplicitLyrics { get; set; }
    public ExplicitLevel ExplicitContentLyrics { get; set; }
    public ExplicitLevel ExplicitCover { get; set; }
    public string? Preview { get; set; }
    public double? Bpm { get; set; }
    public double? Gain { get; set; }
    public List<string> AvailableCountries { get; set; } = new();
    public long AlbumId { get; set; }
    public Album Album { get; set; } = null!;
    public ICollection<Artist> Artists { get; set; } = new List<Artist>();
}

public class Artist
{
    public long Id { get; set; }
    public string Name { get; set; } = null!;
    public string Link { get; set; } = null!;
    public string Picture { get; set; } = null!;
    public string? PictureSmall { get; set; }
    public string? PictureMedium { get; set; }
    public string? PictureBig { get; set; }
    public string? PictureXl { get; set; }
    public string Tracklist { get; set; } = null!;
}

public class Album
{
    public long Id { get; set; }
    public string Title { get; set; } = null!;
    public string Cover { get; set; } = null!;
    public string? CoverSmall { get; set; }
    public string? CoverMedium { get; set; }
    public string? CoverBig { get; set; }
    public string? CoverXl { get; set; }
    public string Tracklist { get; set; } = null!;
}

public class Station
{
    public long Id { get; set; }
    public long RadioId { get; set; }
    public string Title { get; set; } = null!;
    public string Tracklist { get; set; } = null!;
    public Radio Radio { get; set; } = null!;
}

public class Radio
{
    public long Id { get; set; }
    public ICollection<Station> Stations { get; set; } = new List<Station>();
}
