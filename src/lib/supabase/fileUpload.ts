import { supabase } from './client';
import { getCurrentUser } from './auth';
import imageCompression from 'browser-image-compression';

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'EXCEL',
  'application/vnd.ms-excel': 'EXCEL',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'WORD',
  'application/msword': 'WORD',
} as const;

export type SupportedFileType = keyof typeof SUPPORTED_FILE_TYPES;

// File size limits (in bytes) - Original file size limits before compression
export const FILE_SIZE_LIMITS = {
  'image/png': 20 * 1024 * 1024, // 20MB (will be compressed to ~1MB)
  'image/jpeg': 20 * 1024 * 1024, // 20MB (will be compressed to ~1MB)
  'image/jpg': 20 * 1024 * 1024, // 20MB (will be compressed to ~1MB)
  'application/pdf': 25 * 1024 * 1024, // 25MB
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 25 * 1024 * 1024, // 25MB
  'application/vnd.ms-excel': 25 * 1024 * 1024, // 25MB
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 25 * 1024 * 1024, // 25MB
  'application/msword': 25 * 1024 * 1024, // 25MB
} as const;

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

/**
 * Compress image file using browser-image-compression
 */
export const compressImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return file; // Return original file if not an image
  }

  try {
    // Determine compression options based on file size
    const fileSizeMB = file.size / (1024 * 1024);
    let maxSizeMB = 1; // Default 1MB
    let quality = 0.8; // Default 80% quality
    let maxWidthOrHeight = 1024; // Default max dimension

    // Adjust compression based on original file size
    if (fileSizeMB > 10) {
      // Large files: more aggressive compression
      maxSizeMB = 0.8;
      quality = 0.7;
      maxWidthOrHeight = 800;
    } else if (fileSizeMB > 5) {
      // Medium files: moderate compression
      maxSizeMB = 0.9;
      quality = 0.75;
      maxWidthOrHeight = 900;
    } else if (fileSizeMB < 1) {
      // Small files: minimal compression
      maxSizeMB = 0.95;
      quality = 0.85;
      maxWidthOrHeight = 1200;
    }

    const options = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true, // Use web worker for better performance
      fileType: file.type, // Preserve original file type
      quality,
    };

    const compressedFile = await imageCompression(file, options);
    
    // Log compression results
    const originalSize = file.size;
    const compressedSize = compressedFile.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`Image compressed: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`);
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Return original file if compression fails
  }
};

/**
 * Validate file type and size
 */
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check if file type is supported
  if (!SUPPORTED_FILE_TYPES[file.type as SupportedFileType]) {
    return {
      isValid: false,
      error: `File type ${file.type} is not supported. Supported types: ${Object.values(SUPPORTED_FILE_TYPES).join(', ')}`
    };
  }

  // Check file size
  const maxSize = FILE_SIZE_LIMITS[file.type as SupportedFileType];
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File size exceeds maximum limit of ${maxSizeMB}MB`
    };
  }

  return { isValid: true };
};

/**
 * Generate unique filename
 */
const generateFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}_${randomString}.${extension}`;
};

/**
 * Upload file to Supabase storage
 */
export const uploadFile = async (file: File): Promise<FileUploadResult> => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Get current user
    const { user } = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Compress image files before upload
    const fileToUpload = await compressImage(file);
    
    // Generate unique filename
    const fileName = generateFileName(fileToUpload.name);
    const filePath = `chat-attachments/${user.id}/${fileName}`;

    // Upload file to Supabase storage
    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file'
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: file.name, // Keep original filename for display
      fileType: fileToUpload.type,
      fileSize: fileToUpload.size
    };

  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Delete file from Supabase storage
 */
export const deleteFile = async (filePath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.storage
      .from('chat-attachments')
      .remove([filePath]);

    if (error) {
      console.error('File deletion error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete file'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('File deletion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Get file icon based on file type
 */
export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) {
    return '🖼️';
  } else if (fileType === 'application/pdf') {
    return '📄';
  } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
    return '📊';
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return '📝';
  }
  return '📎';
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 