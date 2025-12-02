import { supabase } from '@/integrations/supabase/client';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

async function compressImage(file: File, maxSizeMB = 2): Promise<File> {
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            resolve(new File([blob], file.name, { type: file.type }));
          },
          file.type,
          0.85
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

export async function uploadImage(
  file: File,
  bucket: string,
  destinationPath?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validation
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`File size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`);
  }

  // Compress if needed
  const compressedFile = await compressImage(file);

  // Generate unique filename
  const extension = file.name.split('.').pop();
  const uniqueName = `${crypto.randomUUID()}.${extension}`;
  const path = destinationPath ? `${destinationPath}/${uniqueName}` : uniqueName;

  // Upload
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, compressedFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
    size: compressedFile.size,
  };
}

export async function uploadDocument(
  file: File,
  bucket: string,
  destinationPath?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult & { metadata?: any }> {
  // Validation
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`);
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(`File size exceeds ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB limit`);
  }

  // Generate unique filename
  const extension = file.name.split('.').pop();
  const uniqueName = `${crypto.randomUUID()}.${extension}`;
  const path = destinationPath ? `${destinationPath}/${uniqueName}` : uniqueName;

  // Upload
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  // Extract metadata (simplified)
  const metadata = {
    size: file.size,
    type: file.type,
    name: file.name,
  };

  return {
    url: urlData.publicUrl,
    path: data.path,
    size: file.size,
    metadata,
  };
}

export async function deleteFile(
  bucket: string,
  path: string,
  userId: string
): Promise<void> {
  // Check ownership (simplified - should verify against database)
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
}

export async function getFileUrl(bucket: string, path: string): Promise<string> {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
