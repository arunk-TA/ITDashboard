using ITDashboard.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Authorize]
[ApiController]
[Route("presentations")]
public class PresentationsController : ControllerBase
{
    private readonly string _storagePath;
    private readonly DownloadTokenService _downloadTokens;

    public PresentationsController(IConfiguration config, DownloadTokenService downloadTokens)
    {
        _storagePath = config["PresentationSettings:StoragePath"]!;
        _downloadTokens = downloadTokens;
        if (!Directory.Exists(_storagePath))
            Directory.CreateDirectory(_storagePath);
    }

    // GET api/presentations
    [HttpGet]
    public IActionResult GetList()
    {
        var files = Directory.GetFiles(_storagePath, "*.pptx")
            .Select(f => new FileInfo(f))
            .Select(fi => new
            {
                fileName = fi.Name,
                displayName = Path.GetFileNameWithoutExtension(fi.Name).Replace('_', ' ').Replace('-', ' '),
                sizeKb = Math.Round(fi.Length / 1024.0, 1),
                modifiedDate = fi.LastWriteTime,
                downloadToken = _downloadTokens.CreateToken(fi.Name)
            })
            .OrderByDescending(f => f.modifiedDate);

        return Ok(files);
    }

    // POST api/presentations/upload
    [HttpPost("upload")]
    [RequestSizeLimit(50_000_000)] // 50MB limit, adjust as needed
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file received.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".pptx")
            return BadRequest("Only .pptx files are allowed.");

        // sanitize filename (avoid path traversal / overwrite tricks)
        var safeName = Path.GetFileName(file.FileName);
        var destPath = Path.Combine(_storagePath, safeName);

        if (System.IO.File.Exists(destPath))
            return Conflict($"A file named '{safeName}' already exists. Rename and try again.");

        using var stream = new FileStream(destPath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Ok(new { message = "Uploaded successfully.", fileName = safeName });
    }

    // GET api/presentations/download/{fileName}?token=...
    // Requires either an authenticated session or a short-lived signed token issued by GetList.
    [AllowAnonymous]
    [HttpGet("download/{fileName}")]
    public IActionResult Download(string fileName, [FromQuery] string? token)
    {
        var safeName = Path.GetFileName(fileName); // prevent path traversal

        if (User.Identity?.IsAuthenticated != true &&
            !_downloadTokens.ValidateToken(safeName, token))
        {
            return Unauthorized();
        }

        var filePath = Path.Combine(_storagePath, safeName);

        if (!System.IO.File.Exists(filePath))
            return NotFound();

        var bytes = System.IO.File.ReadAllBytes(filePath);
        return File(bytes, "application/vnd.openxmlformats-officedocument.presentationml.presentation", safeName);
    }

    // DELETE api/presentations/{fileName}
    [HttpDelete("{fileName}")]
    public IActionResult Delete(string fileName)
    {
        var safeName = Path.GetFileName(fileName);
        var filePath = Path.Combine(_storagePath, safeName);

        if (!System.IO.File.Exists(filePath))
            return NotFound();

        System.IO.File.Delete(filePath);
        return Ok(new { message = "Deleted successfully." });
    }
}
