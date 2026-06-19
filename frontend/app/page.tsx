import FormUnggahCitra from "@/components/FormUnggahCitra";

export default function HalamanUtama() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            MammoGuard-AI
          </h1>
          <p className="text-lg text-gray-600">
            Sistem Deteksi Dini Kanker Payudara Menggunakan Kecerdasan Buatan
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <FormUnggahCitra 
              onBerhasilUnggah={(data) => {
                console.log("Berhasil unggah:", data);
                alert(`Citra berhasil diunggah: ${data.nama_berkas}`);
              }}
            />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Tentang Sistem
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                MammoGuard-AI adalah sistem berbasis kecerdasan buatan yang dirancang 
                untuk membantu deteksi dini kanker payudara melalui analisis citra mammogram.
              </p>
              <p>
                Sistem ini menggunakan teknologi deep learning dengan PyTorch untuk 
                menganalisis citra medis dan memberikan hasil prediksi yang akurat.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>Catatan Penting:</strong> Sistem ini adalah alat bantu untuk 
                  tenaga medis. Hasil analisis harus selalu dikonsultasikan dengan 
                  dokter spesialis.
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-center mt-12 text-gray-600">
          <p>© 2024 MammoGuard-AI - Dikembangkan untuk Penelitian dan Edukasi</p>
        </footer>
      </div>
    </div>
  );
}
