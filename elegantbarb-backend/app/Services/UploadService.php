<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadService
{
    /**
     * Validate an image file.
     */
    public function validateImage(?UploadedFile $file): void
    {
        if (! $file) {
            return;
        }

        if (! $file->isValid()) {
            throw new \InvalidArgumentException('Invalid image upload.');
        }

        if ($file->getSize() > 5 * 1024 * 1024) {
            throw new \InvalidArgumentException('Image must not exceed 5MB.');
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (! in_array($file->getMimeType(), $allowedMimes)) {
            throw new \InvalidArgumentException('Image must be jpg, png or webp.');
        }
    }

    /**
     * Validate a document file (PDF).
     */
    public function validateDocument(?UploadedFile $file): void
    {
        if (! $file) {
            return;
        }

        if (! $file->isValid()) {
            throw new \InvalidArgumentException('Invalid document upload.');
        }

        if ($file->getSize() > 10 * 1024 * 1024) {
            throw new \InvalidArgumentException('Document must not exceed 10MB.');
        }

        if ($file->getMimeType() !== 'application/pdf') {
            throw new \InvalidArgumentException('Document must be a PDF.');
        }
    }

    /**
     * Store a file and return its public URL.
     *
     * @param  string  $directory  Relative to public/uploads (e.g. 'logos', 'documents')
     */
    public function store(UploadedFile $file, string $directory = 'general'): string
    {
        $disk = Storage::disk('public');
        $basePath = 'uploads/' . trim($directory, '/');

        $extension = $file->getClientOriginalExtension() ?: $file->extension();
        $filename = Str::uuid() . '_' . time() . '.' . $extension;
        $relativePath = $basePath . '/' . $filename;

        // Handle image resizing if applicable
        if (str_starts_with($file->getMimeType(), 'image/')) {
            $this->processAndStoreImage($file, $disk, $relativePath);
        } else {
            $disk->putFileAs($basePath, $file, $filename);
        }

        return $disk->url($relativePath);
    }

    /**
     * Delete a file by its public URL or relative path.
     */
    public function delete(string $url): bool
    {
        $disk = Storage::disk('public');
        $path = $this->extractPathFromUrl($url);

        if ($disk->exists($path)) {
            return $disk->delete($path);
        }

        return false;
    }

    /**
     * Process and store an image, resizing if width exceeds 1200px.
     */
    private function processAndStoreImage(UploadedFile $file, $disk, string $relativePath): void
    {
        $imageContent = file_get_contents($file->getRealPath());
        $sourceImage = @imagecreatefromstring($imageContent);

        if (! $sourceImage) {
            // Fallback to simple store if GD fails
            $disk->put($relativePath, $imageContent);
            return;
        }

        $width = imagesx($sourceImage);
        $height = imagesy($sourceImage);

        if ($width > 1200) {
            $newWidth = 1200;
            $newHeight = (int) round(($height / $width) * $newWidth);

            $resized = imagecreatetruecolor($newWidth, $newHeight);

            // Preserve transparency for PNG/WebP
            imagealphablending($resized, false);
            imagesavealpha($resized, true);

            imagecopyresampled($resized, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($sourceImage);
            $sourceImage = $resized;

            $width = $newWidth;
            $height = $newHeight;
        }

        $mime = $file->getMimeType();
        $outputStream = fopen('php://temp', 'r+');

        switch ($mime) {
            case 'image/png':
                imagepng($sourceImage, $outputStream, 8);
                break;
            case 'image/webp':
                imagewebp($sourceImage, $outputStream, 85);
                break;
            case 'image/jpeg':
            default:
                imagejpeg($sourceImage, $outputStream, 85);
                break;
        }

        rewind($outputStream);
        $disk->put($relativePath, stream_get_contents($outputStream));
        fclose($outputStream);
        imagedestroy($sourceImage);
    }

    /**
     * Extract relative storage path from a public URL.
     */
    private function extractPathFromUrl(string $url): string
    {
        $storageUrl = Storage::disk('public')->url('');

        if (str_starts_with($url, $storageUrl)) {
            return substr($url, strlen($storageUrl));
        }

        // If path is already relative, return as-is
        return ltrim($url, '/');
    }
}
