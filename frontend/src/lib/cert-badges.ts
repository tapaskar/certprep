/**
 * Map of certification code → official badge image URL.
 *
 * URLs in this map have been verified (HTTP 200) at build time. Certs not
 * present here fall back to a polished generated SVG shield with provider
 * theming and the cert code (see components/cert-badge.tsx). Both look
 * professional, so partial coverage is fine.
 *
 * Sources:
 *   - AWS / GCP / CompTIA / NVIDIA: Credly's public CDN (images.credly.com).
 *   - Microsoft Azure: badges live behind login walls and HTTPS challenges,
 *     so we use the generated fallback for those.
 */

export interface CertBadgeInfo {
  url: string;
}

// Keys are uppercase, normalized cert codes.
export const certBadgeMap: Record<string, CertBadgeInfo> = {
  // ── AWS (Credly) — verified 200 OK ─────────────────────────
  "CLF-C02": { url: "https://images.credly.com/size/340x340/images/00634f82-b07f-4bbd-a6bb-53de397fc3a6/image.png" },
  "AIF-C01": { url: "https://images.credly.com/size/340x340/images/4d4693bb-530e-4bca-9327-de07f3aa2348/image.png" },
  "SAA-C03": { url: "https://images.credly.com/size/340x340/images/0e284c3f-5164-4b21-8660-0d84737941bc/image.png" },
  "DVA-C02": { url: "https://images.credly.com/size/340x340/images/b9feab85-1a43-4f6c-99a5-631b88d5461b/image.png" },
  "SOA-C02": { url: "https://images.credly.com/size/340x340/images/f0d3fbb9-bfa7-4017-9989-7bde8eaf42b1/image.png" },
  "SAP-C02": { url: "https://images.credly.com/size/340x340/images/2d84e428-9078-49b6-a804-13c15383d0de/image.png" },
  "DOP-C02": { url: "https://images.credly.com/size/340x340/images/bd31ef42-d460-493e-8503-39592aaf0458/image.png" },
  "MLS-C01": { url: "https://images.credly.com/size/340x340/images/778bde6c-ad1c-4312-ac33-2fa40d50a147/image.png" },
};

/** Normalize a cert code for lookup (uppercase, strip whitespace) */
export function normalizeCertCode(code: string | null | undefined): string {
  if (!code) return "";
  return code.trim().toUpperCase();
}

export function getCertBadge(code: string | null | undefined): CertBadgeInfo | null {
  return certBadgeMap[normalizeCertCode(code)] ?? null;
}
