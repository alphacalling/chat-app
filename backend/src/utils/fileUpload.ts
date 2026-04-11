export function getFileServingPath(fileName: string): string {
  return `/uploads/${fileName}`;
}

export function getFullFileUrl(
  filePathOrFileName: string | undefined | null,
  baseUrl?: string,
): string {
  if (!filePathOrFileName) {
    return "";
  }

  // If it's already a full URL, return it as is
  if (
    filePathOrFileName.startsWith("http://") ||
    filePathOrFileName.startsWith("https://")
  ) {
    return filePathOrFileName;
  }

  // If it's already a full path like /uploads/file.jpg, use it directly
  // If it's just a filename, convert it to a path
  let relativePath = filePathOrFileName;
  if (!relativePath.startsWith("/")) {
    relativePath = getFileServingPath(relativePath);
  }

  // Ensure it starts with /uploads
  if (!relativePath.startsWith("/uploads/")) {
    // Extract just the filename if it contains /uploads/
    let filename: string;
    if (relativePath.includes("/uploads/")) {
      const parts = relativePath.split("/uploads/");
      filename =
        parts.length > 1 && parts[1] ? parts[1] : parts[0] || relativePath;
    } else {
      filename =
        relativePath.replace("/uploads", "").replace(/^\//, "") || relativePath;
    }
    relativePath = `/uploads/${filename}`;
  }

  if (baseUrl) {
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}${relativePath}`;
  }
  const port = process.env.PORT || 8080;
  return `http://localhost:${port}${relativePath}`;
}
