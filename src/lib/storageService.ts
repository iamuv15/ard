import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://luqqevfwgjpmvuyeyvzv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const BUCKET_NAME = 'audio-masterclasses';

let supabaseClient: any = null;
if (SUPABASE_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
}

export interface UploadResult {
  url: string;
  storagePath: string;
  isLocal: boolean;
  sizeBytes: number;
}

/**
 * Uploads an audio MP3 file to Supabase Storage bucket.
 * Falls back to local public directory if Supabase service role key is not yet configured.
 */
export async function uploadAudioFile(
  localFilePath: string,
  destinationStoragePath: string
): Promise<UploadResult> {
  const fileBuffer = fs.readFileSync(localFilePath);
  const sizeBytes = fileBuffer.length;

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

      // Upload file with cache control and audio/mpeg content type
      const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(destinationStoragePath, fileBuffer, {
          contentType: 'audio/mpeg',
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

  // Local fallback: save to public/audio/...
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
}

/**
 * Delete audio file from storage (Supabase or local)
 */
export async function deleteAudioFile(storagePath: string): Promise<void> {
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
