// Zona waktu dikunci agar hasil di server dan browser sama (menghindari hydration mismatch)
export const formatDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }) : '';
