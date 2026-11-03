import QRCode from 'qrcode';

// 1. CALCULATE FILE HASHES (Web Crypto API)
export async function calculateFileHashes(
  file: File
): Promise<{ sha256: string; sha512: string; sha1: string; size: number }> {
  const buffer = await file.arrayBuffer();

  const [sha256Buffer, sha512Buffer, sha1Buffer] = await Promise.all([
    crypto.subtle.digest('SHA-256', buffer),
    crypto.subtle.digest('SHA-512', buffer),
    crypto.subtle.digest('SHA-1', buffer),
  ]);

  const toHex = (buf: ArrayBuffer) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  return {
    sha256: toHex(sha256Buffer),
    sha512: toHex(sha512Buffer),
    sha1: toHex(sha1Buffer),
    size: file.size,
  };
}

// 2. FILE INSPECTOR & HEX VIEWER
export interface HexLine {
  offset: string;
  hex: string;
  ascii: string;
}

export interface FileInspectionResult {
  detectedMime: string;
  signatureMatch: string;
  byteSize: number;
  lastModified: Date;
  hexLines: HexLine[];
}

export async function inspectFileBytes(file: File, maxBytes: number = 256): Promise<FileInspectionResult> {
  const slice = file.slice(0, maxBytes);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Magic bytes identification
  let detectedMime = file.type || 'application/octet-stream';
  let signatureMatch = 'Generic Binary';

  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    detectedMime = 'application/pdf';
    signatureMatch = 'Adobe PDF Document (%PDF)';
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    detectedMime = 'image/png';
    signatureMatch = 'PNG Image File (\x89PNG)';
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    detectedMime = 'image/jpeg';
    signatureMatch = 'JPEG/JFIF Image';
  } else if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
    detectedMime = 'application/zip';
    signatureMatch = 'ZIP Archive / Office Document (PK)';
  } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    detectedMime = 'image/gif';
    signatureMatch = 'GIF Image File (GIF8)';
  } else if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    detectedMime = 'image/webp';
    signatureMatch = 'WebP Image (RIFF...WEBP)';
  }

  // Format hex dump (16 bytes per line)
  const hexLines: HexLine[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const offset = i.toString(16).padStart(8, '0');
    const hexParts: string[] = [];
    let ascii = '';

    for (let j = 0; j < 16; j++) {
      if (j < chunk.length) {
        const b = chunk[j];
        hexParts.push(b.toString(16).padStart(2, '0'));
        ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
      } else {
        hexParts.push('  ');
        ascii += ' ';
      }
    }

    const hex = `${hexParts.slice(0, 8).join(' ')}  ${hexParts.slice(8).join(' ')}`;
    hexLines.push({ offset, hex, ascii });
  }

  return {
    detectedMime,
    signatureMatch,
    byteSize: file.size,
    lastModified: new Date(file.lastModified),
    hexLines,
  };
}

// 3. QR CODE GENERATOR
export async function generateQrCode(
  data: string,
  options: {
    darkColor?: string;
    lightColor?: string;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    width?: number;
  } = {}
): Promise<{ pngDataUrl: string; svgString: string }> {
  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    margin: options.margin !== undefined ? options.margin : 2,
    width: options.width || 400,
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#ffffff',
    },
  };

  const pngDataUrl = await QRCode.toDataURL(data, qrOptions);
  const svgString = await QRCode.toString(data, {
    type: 'svg',
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    margin: options.margin !== undefined ? options.margin : 2,
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#ffffff',
    },
  });

  return { pngDataUrl, svgString };
}

// 4. PASSWORD GENERATOR
export function generatePassword(
  length: number = 18,
  options: {
    upper?: boolean;
    lower?: boolean;
    numbers?: boolean;
    symbols?: boolean;
  } = {}
): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing I, O
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // Removed confusing l
  const numbers = '23456789'; // Removed confusing 0, 1
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let pool = '';
  if (options.lower !== false) pool += lower;
  if (options.upper !== false) pool += upper;
  if (options.numbers !== false) pool += numbers;
  if (options.symbols !== false) pool += symbols;
  if (!pool) pool = lower + numbers;

  const randomBytes = new Uint32Array(length);
  crypto.getRandomValues(randomBytes);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += pool[randomBytes[i] % pool.length];
  }

  return result;
}
