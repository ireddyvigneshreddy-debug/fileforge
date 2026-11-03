import JSZip from 'jszip';

export interface ZipEntryInfo {
  name: string;
  dir: boolean;
  uncompressedSize: number;
  date: Date;
}

// 1. CREATE ZIP ARCHIVE
export async function createZipArchive(
  files: File[],
  compressionLevel: number = 6 // 1-9
): Promise<{ blob: Blob; size: number }> {
  const zip = new JSZip();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    zip.file(file.name, arrayBuffer);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: compressionLevel,
    },
  });

  return { blob: zipBlob, size: zipBlob.size };
}

// 2. INSPECT ZIP ARCHIVE
export async function inspectZipArchive(file: File): Promise<ZipEntryInfo[]> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const entries: ZipEntryInfo[] = [];

  zip.forEach((relativePath, zipEntry) => {
    // Access uncompressed size from JSZip internal or default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uncompressedSize = (zipEntry as any)._data?.uncompressedSize || 0;
    entries.push({
      name: relativePath,
      dir: zipEntry.dir,
      uncompressedSize,
      date: zipEntry.date,
    });
  });

  return entries;
}

// 3. EXTRACT ALL FILES FROM ZIP
export async function extractAllFromZip(
  file: File
): Promise<{ name: string; blob: Blob; url: string; size: number }[]> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const extracted: { name: string; blob: Blob; url: string; size: number }[] = [];

  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const blob = await zipEntry.async('blob');
    const url = URL.createObjectURL(blob);
    extracted.push({
      name: filename,
      blob,
      url,
      size: blob.size,
    });
  }

  return extracted;
}


// 4. COMPRESS SINGLE FILE WITH GZIP STREAM
export async function compressFileGzip(file: File): Promise<{ blob: Blob; size: number }> {
  if (typeof CompressionStream !== 'undefined') {
    const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const blob = await response.blob();
    return { blob, size: blob.size };
  } else {
    return createZipArchive([file], 9);
  }
}

// 5. COMPRESS MULTIPLE GENERIC FILES WITH CUSTOM STRENGTH
export async function compressGenericFiles(
  files: File[],
  format: 'zip' | 'gzip',
  compressionLevel: number = 9
): Promise<{ blob: Blob; fileName: string; size: number }> {
  if (format === 'gzip' && files.length === 1) {
    const gz = await compressFileGzip(files[0]);
    return {
      blob: gz.blob,
      fileName: `${files[0].name}.gz`,
      size: gz.size,
    };
  }

  const res = await createZipArchive(files, compressionLevel);
  const baseName = files.length === 1 ? files[0].name.replace(/\.[^/.]+$/, '') : 'compressed-bundle';
  return {
    blob: res.blob,
    fileName: `${baseName}.zip`,
    size: res.size,
  };
}

// 6. CREATE ZIP FROM PROCESSED BLOBS (FOR BATCH MULTI-FILE OPERATIONS)
export async function createZipFromBlobs(
  items: { name: string; blob: Blob }[],
  compressionLevel: number = 6
): Promise<Blob> {
  const zip = new JSZip();
  const seenNames = new Map<string, number>();

  for (const item of items) {
    let name = item.name;
    const count = seenNames.get(name) || 0;
    if (count > 0) {
      const extMatch = name.match(/^(.*?)(\.[^.]+)?$/);
      const base = extMatch?.[1] || name;
      const ext = extMatch?.[2] || '';
      name = `${base} (${count})${ext}`;
    }
    seenNames.set(item.name, count + 1);

    const arrayBuffer = await item.blob.arrayBuffer();
    zip.file(name, arrayBuffer);
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: compressionLevel,
    },
  });
}

