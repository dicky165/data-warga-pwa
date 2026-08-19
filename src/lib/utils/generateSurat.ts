// Hanya berisi helper fungsional, tidak menyimpan data UI/Form
export function formatNomorSurat(noUrut: number, rt: string, rw: string, kodeSurat: string): string {
  const bulanRomawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()];
  const tahun = new Date().getFullYear();
  const urutPad = String(noUrut).padStart(3, '0');

  return `${urutPad}/${kodeSurat}/RT.${rt}/RW.${rw}/${bulanRomawi}/${tahun}`;
}