# 🔒 KEBIJAKAN PRIVASI - MammoGuard AI (Prototype Akademik)

## Perlindungan Data Pribadi Pasien - TEMPLATE untuk Produksi

**Terakhir Diperbarui:** 22 Juli 2026  
**Versi:** 1.0 (Draft untuk Demonstrasi)

---

## ⚠️ DISCLAIMER PENTING - BACA INI DULU!

**Dokumen ini adalah TEMPLATE demonstrasi untuk keperluan presentasi akademik.**

### Status Proyek Saat Ini:
- 📚 **Prototype akademik** untuk proyek magang (3 bulan)
- 📊 **Menggunakan data sintetis** atau dataset publik (CBIS-DDSM)
- ❌ **BUKAN sistem produksi** yang digunakan rumah sakit riil
- ❌ **TIDAK ada data pasien riil** dalam sistem ini
- ❌ **TIDAK melalui ethical clearance/IRB** (tidak ada kemitraan RS)

### Tujuan Dokumen Ini:
✅ Mendemonstrasikan **awareness terhadap UU PDP** dan regulasi medis  
✅ Menunjukkan **analytical thinking** tentang privacy requirements  
✅ Memberikan **starting point** jika ada pihak yang ingin melanjutkan  
❌ BUKAN klaim bahwa sistem ini sudah compliant untuk produksi

---

## 📋 TENTANG KEBIJAKAN INI (KONTEKS AKADEMIK)

Dokumen ini menjelaskan bagaimana sistem AI untuk analisis mammogram **SEHARUSNYA** menangani data pribadi pasien **JIKA** digunakan di rumah sakit dengan data riil, sesuai dengan:

- **UU No. 27 Tahun 2022** tentang Perlindungan Data Pribadi (UU PDP)
- **UU No. 29 Tahun 2004** tentang Praktik Kedokteran
- **UU No. 36 Tahun 2009** tentang Kesehatan
- **Permenkes No. 24 Tahun 2022** tentang Rekam Medis

**⚠️ CATATAN:** Ini adalah **demonstrasi awareness**, BUKAN implementasi riil. Sistem prototype saat ini menggunakan data sintetis tanpa informasi pribadi yang dilindungi UU PDP.

---

## 📊 DATA YANG AKAN DIKUMPULKAN (JIKA SISTEM PRODUKSI)

**⚠️ DISCLAIMER:** Data di bawah adalah **contoh untuk sistem produksi**. Prototype akademik saat ini **TIDAK mengumpulkan data pribadi riil**.

### 1. **Data Identitas Pasien** (Jika Produksi)
- Nama lengkap pasien
- ID Pasien (auto-generated)
- Tanggal pemeriksaan

**Status Saat Ini:** Menggunakan nama dummy/contoh ("Ibu Siti Aminah", dll) untuk demo, BUKAN pasien riil.

### 2. **Data Kesehatan (Data Pribadi Spesifik)** (Jika Produksi)
- Citra mammogram (payudara kanan dan kiri)
- Hasil analisis AI (Benign/Malignant)
- Confidence score prediksi
- Klasifikasi BI-RADS
- Grad-CAM heatmap (visualisasi area mencurigakan)
- Catatan dokter

**Status Saat Ini:** Menggunakan citra dari dataset publik CBIS-DDSM atau gambar contoh tanpa identitas pasien.

### 3. **Data Teknis** (Jika Produksi)
- Dokter yang melakukan pemeriksaan (ID dan nama)
- Timestamp upload dan analisis
- IP address (untuk audit log)
- Model AI yang digunakan

**Status Saat Ini:** User demo ("dr.sarah") untuk keperluan testing interface.

---

## 🎯 TUJUAN PENGGUNAAN DATA

Data pribadi Anda dikumpulkan dan digunakan untuk:

1. ✅ **Diagnosis Medis** - Membantu dokter mendeteksi kanker payudara
2. ✅ **Dokumentasi Rekam Medis** - Menyimpan riwayat pemeriksaan pasien
3. ✅ **Audit Medikolegal** - Melacak keputusan dokter untuk pertanggungjawaban hukum
4. ✅ **Peningkatan Kualitas** - Evaluasi akurasi AI (dengan data yang dianonimkan)

---

## 🔐 DASAR HUKUM PEMROSESAN DATA

Kami memproses data pribadi Anda berdasarkan:

### **1. Persetujuan Explicit (Pasal 8 UU PDP)**
- Setiap kali data pasien diinput, dokter memberikan persetujuan bahwa pasien telah memberikan consent untuk penyimpanan data medis
- Consent dapat ditarik kembali (lihat bagian "Hak Anda")

### **2. Kepentingan Vital (Pasal 21 ayat 2 UU PDP)**
- Penggunaan data untuk diagnosis dan perawatan kesehatan merupakan kepentingan vital subjek data

### **3. Kewajiban Hukum (UU Praktik Kedokteran)**
- Pasal 46: Dokter wajib membuat rekam medis
- Pasal 47: Rekam medis harus disimpan dan dijaga kerahasiaannya

---

## 🔐 BAGAIMANA DATA SEHARUSNYA DILINDUNGI (REQUIREMENTS PRODUKSI)

**⚠️ Status Saat Ini:** Prototype akademik dengan implementasi keamanan minimal untuk demo. Untuk produksi perlu upgrade signifikan.

### **Keamanan Teknis (Requirements Produksi):**

1. ✅ **Enkripsi Password** - Password dokter di-hash dengan bcrypt (✅ SUDAH DIIMPLEMENTASI)
2. ✅ **Access Control** - Hanya dokter yang login dapat akses data (✅ SUDAH DIIMPLEMENTASI)
3. 🟡 **Audit Trail** - Demo concept dengan audit_koreksi collection (🟡 PROOF-OF-CONCEPT)
4. ⚠️ **Database Security** - MongoDB dengan authentication credentials (⚠️ LOCAL ONLY, perlu production hardening)
5. ❌ **Encryption at Rest** - BELUM DIIMPLEMENTASI (perlu MongoDB Enterprise + RS infrastructure)
6. ❌ **TLS/SSL** - BELUM DIIMPLEMENTASI (demo menggunakan HTTP localhost)
7. ❌ **Network Segmentation** - BELUM DIIMPLEMENTASI (perlu konfigurasi jaringan RS)
8. ❌ **Intrusion Detection** - BELUM DIIMPLEMENTASI (perlu security appliance RS)

### **Keamanan Organisasi (Requirements Produksi):**

1. ✅ **Pembatasan Akses** - Multi-role (Dokter, IT Admin) (✅ SUDAH DIIMPLEMENTASI)
2. 🟡 **Audit Log** - Tracking konsep minimal (🟡 PROOF-OF-CONCEPT)
3. ❌ **Data Loss Prevention** - BELUM DIIMPLEMENTASI (perlu backup strategy RS)
4. ❌ **Security Training** - BELUM DILAKUKAN (tidak ada user riil untuk training)
5. ❌ **Incident Response Plan** - BELUM DIBUAT (perlu tim security RS)

### **Catatan untuk Produksi:**
> Sistem ini saat ini adalah **prototype untuk demo/magang**. Untuk penggunaan produksi di rumah sakit, diperlukan:
> - ✅ Enkripsi at-rest (MongoDB encryption atau disk-level encryption)
> - ✅ TLS/SSL untuk komunikasi (HTTPS, MongoDB SSL)
> - ✅ Penetration testing oleh pihak ketiga
> - ✅ ISO 27001 atau ISO 27701 certification (jika diperlukan RS)
> - ✅ Security audit reguler
> - ✅ Disaster recovery plan
> 
> **Semua di atas BELUM diimplementasi** dan memerlukan kemitraan formal dengan rumah sakit.

---

## 👤 HAK ANDA (Subjek Data Pribadi)

Sesuai **Pasal 5 UU PDP**, Anda memiliki hak:

### **1. Hak Akses (Right to Access)**
- Anda berhak mengetahui data pribadi apa saja yang kami simpan tentang Anda
- Hubungi dokter atau administrator sistem untuk request akses

### **2. Hak Koreksi (Right to Rectification)**
- Jika ada data yang salah (misalnya nama), Anda berhak meminta koreksi
- Dokter dapat mengupdate data pasien melalui sistem

### **3. Hak Hapus (Right to Erasure / "Right to be Forgotten")**
- Anda berhak meminta penghapusan data pribadi Anda
- **CATATAN:** Penghapusan data medis harus mempertimbangkan kewajiban hukum penyimpanan rekam medis (minimal 5 tahun sesuai Permenkes)
- Request penghapusan akan dievaluasi secara case-by-case

### **4. Hak Pembatasan Pemrosesan (Right to Restriction)**
- Anda berhak meminta pembatasan penggunaan data (misalnya: jangan digunakan untuk riset)

### **5. Hak Portabilitas (Right to Data Portability)**
- Anda berhak meminta salinan data Anda dalam format yang dapat dibaca mesin (PDF, JSON)
- Gunakan fitur "Download PDF Report" di sistem

### **6. Hak Penarikan Persetujuan (Right to Withdraw Consent)**
- Anda dapat menarik consent kapan saja
- Konsekuensi: Data yang sudah diproses tidak dapat "di-undo", tapi pemrosesan lebih lanjut akan dihentikan

---

## 📤 PEMBAGIAN DATA KE PIHAK KETIGA

### **Kami TIDAK Membagikan Data ke Pihak Ketiga:**
- ❌ Tidak dijual ke pihak ketiga
- ❌ Tidak digunakan untuk iklan
- ❌ Tidak dikirim ke cloud storage eksternal (kecuali R2 Cloudflare dengan enkripsi)

### **Pengecualian (Jika Diperlukan):**
1. ✅ **Rumah Sakit Lain** - Jika pasien rujukan (dengan consent terpisah)
2. ✅ **Kemenkes/Dinkes** - Jika ada kewajiban laporan (data dianonimkan)
3. ✅ **Penegak Hukum** - Jika ada surat perintah pengadilan

---

## ⏳ BERAPA LAMA KAMI MENYIMPAN DATA

### **Retention Policy (Sesuai Permenkes No. 24/2022):**

| Jenis Data | Durasi Penyimpanan | Dasar Hukum |
|------------|-------------------|-------------|
| Rekam Medis (termasuk citra) | Minimal 5 tahun | Permenkes 24/2022 Pasal 7 |
| Audit Log | 2 tahun | Best practice IT |
| Data anonim untuk riset | Permanen (dianonimkan) | Pasal 21 UU PDP |

### **Setelah Periode Retention:**
- Data akan dihapus atau dianonimkan secara permanen
- Backup juga akan dihapus

---

## 📞 HUBUNGI KAMI (TEMPLATE untuk Produksi)

**⚠️ CATATAN:** Kontak di bawah adalah **contoh template**. Untuk prototype akademik ini, hubungi dosen pembimbing atau tim magang.

**Data Protection Officer (DPO) - Jika Produksi:**
- Email: privacy@hospital.com (contoh)
- Telepon: (021) 1234-5678 (contoh)
- Alamat: [Alamat Rumah Sakit] (contoh)

**Untuk Pertanyaan tentang Prototype Akademik Ini:**
- Hubungi: Dosen Pembimbing / Tim Magang
- Email: [email dosen/mahasiswa]
- Context: Proyek magang, bukan sistem produksi

**Waktu Respons (Jika Produksi):**
- Request akses/koreksi data: 14 hari kerja
- Request kompleks (penghapusan data): 30 hari kerja

---

## 🔄 PERUBAHAN KEBIJAKAN

Kami dapat mengubah kebijakan privasi ini sesuai dengan:
- Perubahan regulasi (UU PDP, Permenkes, dll)
- Peningkatan fitur sistem
- Feedback dari audit security

**Jika ada perubahan material:**
- Kami akan memberitahu dokter dan pasien melalui notifikasi sistem
- Versi terbaru selalu tersedia di aplikasi (link footer)

---

## ⚖️ PENYELESAIAN SENGKETA

Jika Anda tidak puas dengan cara kami menangani data pribadi Anda:

1. **Hubungi DPO kami terlebih dahulu** (privacy@hospital.com)
2. Jika tidak terselesaikan, Anda dapat mengadukan ke:
   - **Kementerian Komunikasi dan Informatika (Kominfo)**
   - **Lembaga Perlindungan Data Pribadi** (setelah terbentuk sesuai UU PDP)
   - **Ombudsman RI**

---

## ✅ PERSETUJUAN (UNTUK PRODUKSI)

**⚠️ CATATAN:** Untuk prototype akademik ini, tidak ada persetujuan riil karena tidak ada data pasien riil.

**Jika sistem ini digunakan produksi**, dengan memasukkan data pasien, dokter menyatakan bahwa:

✅ Anda telah membaca dan memahami kebijakan privasi ini  
✅ Anda telah mendapatkan **informed consent tertulis** dari pasien untuk menyimpan data mereka  
✅ Anda setuju bahwa data akan diproses sesuai dengan kebijakan ini  
✅ Pasien telah dijelaskan tentang penggunaan AI dalam diagnosis

---

## 🏥 COMPLIANCE STATEMENT (UNTUK PRODUKSI)

**Untuk Deployment Produksi di Rumah Sakit:**

Sistem ini adalah **prototype akademik**. Sebelum digunakan produksi dengan data pasien riil, WAJIB dilakukan:

- [ ] **Ethical Clearance** dari Komite Etik Penelitian Kesehatan RS
- [ ] **Security Audit** oleh pihak ketiga (certified auditor)
- [ ] **Penetration Testing** untuk identifikasi vulnerabilities
- [ ] **Data Protection Impact Assessment (DPIA)** sesuai Pasal 35 UU PDP
- [ ] **Sertifikasi ISO 27001** atau ISO 27701 (jika dipersyaratkan RS)
- [ ] **Informed Consent Form** yang ditandatangani pasien
- [ ] **Training untuk dokter** tentang data protection dan penggunaan sistem
- [ ] **Perjanjian Pengolahan Data** dengan vendor (jika pakai cloud storage)
- [ ] **Incident Response Plan** dan disaster recovery procedure
- [ ] **Regular Compliance Audit** (minimal tahunan)

**Status Saat Ini: TIDAK ADA yang checklist di atas sudah dilakukan** karena ini prototype akademik tanpa kemitraan formal dengan rumah sakit.

---

## 📚 REFERENSI & SUMBER HUKUM

Dokumen ini dibuat berdasarkan pemahaman terhadap:
- UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi
- Permenkes No. 24 Tahun 2022 tentang Rekam Medis Elektronik
- Best practices GDPR (General Data Protection Regulation) EU
- Guidelines HIPAA (Health Insurance Portability and Accountability Act) USA
- ISO/IEC 27701:2019 (Privacy Information Management)

**Catatan:** Interpretasi regulasi dalam dokumen ini adalah untuk keperluan akademik. Implementasi riil memerlukan konsultasi dengan legal counsel dan compliance officer rumah sakit.

---

**Terakhir Ditinjau:** 22 Juli 2026  
**Next Review:** N/A (prototype akademik, bukan sistem produksi)  
**Status:** Draft Template untuk Demonstrasi Awareness

---

📧 Untuk pertanyaan tentang dokumen ini: Hubungi dosen pembimbing atau tim magang  
⚠️ Bukan sistem produksi - menggunakan data sintetis/dataset publik untuk demo
