/**
 * Capture each infographic page div as a JPEG data URL,
 * then assemble into an A4 PDF.
 */
export async function captureInfographicPages(totalPages: number): Promise<string[]> {
  const html2canvas = (await import('html2canvas')).default;
  const pages: string[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const el = document.getElementById(`pdf-infographic-page-${i}`);
    if (!el) continue;

    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#0F172A',
      useCORS: true,
      logging: false,
    });
    pages.push(canvas.toDataURL('image/jpeg', 0.92));
  }

  return pages;
}
