using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("presentations")]
public class PresentationsController : ControllerBase
{
    private readonly string _storagePath;

    public PresentationsController(IConfiguration config)
    {
        _storagePath = config["PresentationSettings:StoragePath"]!;
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
                modifiedDate = fi.LastWriteTime
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

    // GET api/presentations/download/{fileName}
    [HttpGet("download/{fileName}")]
    public IActionResult Download(string fileName)
    {
        var safeName = Path.GetFileName(fileName); // prevent path traversal
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