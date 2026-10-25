import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'audio-masterclasses';

function getSupabaseUrl(key?: string) {
  if (key && key.includes('.')) {
    try {
      const parts = key.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.ref) return `https://${payload.ref}.supabase.co`;
    } catch {}
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NEXT_PUBLIC_SUPABASE_URL;
  return 'https://nvcbchefumrcdkvjvquw.supabase.co';
}

function getSupabaseClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!key) return null;
  const url = getSupabaseUrl(key);
  return createClient(url, key);
}

export interface UploadResult {
  url: string;
  storagePath: string;
  isLocal: boolean;
  sizeBytes: number;
}

/**
 * Uploads an in-memory audio buffer directly to Supabase Storage bucket.
 * Falls back to local public directory if Supabase service role key is not yet configured.
 */
export async function uploadAudioBuffer(
  fileBuffer: Buffer,
  destinationStoragePath: string,
  contentType: string = 'audio/mpeg'
): Promise<UploadResult> {
  const sizeBytes = fileBuffer.length;
  const supabaseClient = getSupabaseClient();

  if (supabaseClient) {
    try {
      // Ensure bucket exists
      const { data: buckets } = await supabaseClient.storage.listBuckets();
      const bucketExists = buckets?.some((b: any) => b.name === BUCKET_NAME);
      if (!bucketExists) {
        await supabaseClient.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
      }

      // Upload file with cache control and contentType
      const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(destinationStoragePath, fileBuffer, {
          contentType,
          upsert: true
        });

      if (error) {
        console.error('[Supabase Storage] Upload error:', error.message);
        throw error;
      }

      const { data: publicUrlData } = supabaseClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(destinationStoragePath);

      console.log(`[Supabase Storage] Successfully uploaded to: ${publicUrlData.publicUrl}`);
      return {
        url: publicUrlData.publicUrl,
        storagePath: destinationStoragePath,
        isLocal: false,
        sizeBytes
      };
    } catch (err: any) {
      console.warn(`[Supabase Storage] Falling back to local storage due to upload failure: ${err.message}`);
    }
  }

  // Local fallback: save to public/audio/... (safely wrapped in try/catch for read-only serverless environments)
  try {
    const publicDest = path.join(process.cwd(), 'public', 'audio', destinationStoragePath);
    const dir = path.dirname(publicDest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(publicDest, fileBuffer);

    const localUrl = `/audio/${destinationStoragePath.replace(/\\/g, '/')}`;
    console.log(`[Storage] Saved locally to ${localUrl} (${sizeBytes} bytes)`);

    return {
      url: localUrl,
      storagePath: destinationStoragePath,
      isLocal: true,
      sizeBytes
    };
  } catch (err: any) {
    console.warn(`[Storage] Local file write skipped (e.g. read-only serverless environment): ${err.message}`);
    // If Supabase failed and local is read-only, throw clear error
    throw new Error(`Upload failed and local filesystem is read-only: ${err.message}`);
  }
}

/**
 * Uploads an audio file from local disk to Supabase Storage bucket.
 */
export async function uploadAudioFile(
  localFilePath: string,
  destinationStoragePath: string,
  contentType: string = 'audio/mpeg'
): Promise<UploadResult> {
  const fileBuffer = fs.readFileSync(localFilePath);
  return uploadAudioBuffer(fileBuffer, destinationStoragePath, contentType);
}

/**
 * Delete audio file from storage (Supabase or local)
 */
export async function deleteAudioFile(storagePath: string): Promise<void> {
  const supabaseClient = getSupabaseClient();
  if (supabaseClient) {
    try {
      await supabaseClient.storage.from(BUCKET_NAME).remove([storagePath]);
      console.log(`[Supabase Storage] Deleted: ${storagePath}`);
    } catch (err: any) {
      console.warn(`[Supabase Storage] Error deleting ${storagePath}:`, err.message);
    }
  }

  // Also remove local if exists
  const publicDest = path.join(process.cwd(), 'public', 'audio', storagePath);
  if (fs.existsSync(publicDest)) {
    try {
      fs.unlinkSync(publicDest);
      console.log(`[Storage] Deleted local file: ${publicDest}`);
    } catch (e) {
      // ignore
    }
  }
}
