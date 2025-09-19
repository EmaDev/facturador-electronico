export async function fetchAsDataUrl(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  const blob = await res.blob();
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}