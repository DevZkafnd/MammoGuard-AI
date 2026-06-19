/**
 * Layanan untuk melakukan komunikasi dengan API Backend
 */

const URL_DASAR_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Fungsi helper untuk melakukan fetch dengan error handling
 */
async function fetchDenganErrorHandling(url: string, opsi?: RequestInit) {
  try {
    const respons = await fetch(url, opsi);
    
    if (!respons.ok) {
      const pesanError = await respons.text();
      throw new Error(pesanError || `HTTP error! status: ${respons.status}`);
    }
    
    return await respons.json();
  } catch (error) {
    console.error("Error pada fetch:", error);
    throw error;
  }
}

/**
 * Mengunggah citra mammogram untuk analisis
 */
export async function unggahCitra(berkas: File) {
  const dataForm = new FormData();
  dataForm.append("berkas", berkas);
  
  return fetchDenganErrorHandling(`${URL_DASAR_API}/analisis/unggah`, {
    method: "POST",
    body: dataForm,
  });
}

/**
 * Mendapatkan riwayat analisis
 */
export async function dapatkanRiwayat() {
  return fetchDenganErrorHandling(`${URL_DASAR_API}/analisis/riwayat`, {
    method: "GET",
  });
}

/**
 * Memeriksa status kesehatan server
 */
export async function cekKesehatanServer() {
  return fetchDenganErrorHandling(`${URL_DASAR_API}/kesehatan`, {
    method: "GET",
  });
}
