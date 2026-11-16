/** Lets the browser download a text file (plans are saved by downloading the plan file, US5). */
export function downloadFile(fileName: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  // revoke later: some browsers start the download asynchronously
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
