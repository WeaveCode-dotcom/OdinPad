/** Server-side validation should still apply if uploads are added to Edge Functions. */

export const FILE_SIZE_LIMITS = {
  /** Cover image before base64 (library card / project metadata) */
  coverImageBytes: 2 * 1024 * 1024,
  /** Novel JSON backup import */
  novelJsonBytes: 15 * 1024 * 1024,
  /** Markdown / plain text idea import */
  markdownTextBytes: 8 * 1024 * 1024,
  /** Word (.docx) preview / import */
  wordDocxBytes: 12 * 1024 * 1024,
} as const;

export function assertFileSizeWithin(file: File, maxBytes: number, label: string): void {
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`${label} is too large (max ${mb} MB).`);
  }
}
