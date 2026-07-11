"""
Modul untuk mengelola upload dan download file ke/dari Cloudflare R2 Storage
"""

import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional
import uuid
from datetime import datetime

class R2Storage:
    """Kelas untuk mengelola operasi storage dengan Cloudflare R2"""
    
    def __init__(self):
        """Inisialisasi koneksi ke R2 Storage"""
        self.account_id = os.getenv("R2_ACCOUNT_ID")
        self.access_key = os.getenv("R2_ACCESS_KEY_ID")
        self.secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("R2_BUCKET_NAME", "mammoguard-storage")
        self.endpoint_url = os.getenv("R2_ENDPOINT_URL")
        self.public_url = os.getenv("R2_PUBLIC_URL")
        
        # Cek apakah R2 dikonfigurasi
        self.r2_enabled = bool(
            self.account_id and 
            self.access_key and 
            self.secret_key and 
            self.endpoint_url
        )
        
        if self.r2_enabled:
            try:
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name='auto'
                )
                print("✓ R2 Storage berhasil dikonfigurasi")
            except Exception as e:
                print(f"✗ Gagal mengkonfigurasi R2 Storage: {e}")
                self.r2_enabled = False
                self.s3_client = None
        else:
            print("⚠ R2 Storage tidak dikonfigurasi, menggunakan storage lokal")
            self.s3_client = None
    
    def generate_unique_filename(self, original_filename: str) -> str:
        """Generate nama file unik dengan timestamp dan UUID"""
        ext = os.path.splitext(original_filename)[1]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        return f"{timestamp}_{unique_id}{ext}"
    
    async def upload_file(
        self, 
        file_content: bytes, 
        original_filename: str,
        folder: str = "raw"
    ) -> dict:
        """
        Upload file ke R2 atau storage lokal
        
        Args:
            file_content: Konten file dalam bytes
            original_filename: Nama file asli
            folder: Folder tujuan (raw/heatmaps)
            
        Returns:
            Dict dengan informasi file yang diupload
        """
        unique_filename = self.generate_unique_filename(original_filename)
        
        if self.r2_enabled and self.s3_client:
            return await self._upload_to_r2(file_content, unique_filename, folder)
        else:
            return await self._upload_to_local(file_content, unique_filename, folder)
    
    async def _upload_to_r2(
        self, 
        file_content: bytes, 
        filename: str,
        folder: str
    ) -> dict:
        """Upload file ke Cloudflare R2"""
        try:
            object_key = f"{folder}/{filename}"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_content,
                ContentType='image/png'
            )
            
            # Generate public URL
            if self.public_url:
                file_url = f"{self.public_url}/{object_key}"
            else:
                file_url = f"{self.endpoint_url}/{self.bucket_name}/{object_key}"
            
            return {
                "storage_type": "r2",
                "filename": filename,
                "folder": folder,
                "object_key": object_key,
                "url": file_url,
                "status": "berhasil"
            }
            
        except ClientError as e:
            print(f"✗ Error upload ke R2: {e}")
            # Fallback ke storage lokal jika gagal
            return await self._upload_to_local(file_content, filename, folder)
    
    async def _upload_to_local(
        self, 
        file_content: bytes, 
        filename: str,
        folder: str
    ) -> dict:
        """Upload file ke storage lokal"""
        try:
            # Buat direktori jika belum ada
            base_dir = "./storage/images"
            folder_path = os.path.join(base_dir, folder)
            os.makedirs(folder_path, exist_ok=True)
            
            # Simpan file
            file_path = os.path.join(folder_path, filename)
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            return {
                "storage_type": "local",
                "filename": filename,
                "folder": folder,
                "file_path": file_path,
                "url": f"/storage/images/{folder}/{filename}",
                "status": "berhasil"
            }
            
        except Exception as e:
            print(f"✗ Error upload ke storage lokal: {e}")
            raise
    
    def get_file_url(self, filename: str, folder: str = "raw") -> str:
        """Dapatkan URL file"""
        if self.r2_enabled and self.public_url:
            return f"{self.public_url}/{folder}/{filename}"
        else:
            return f"/storage/images/{folder}/{filename}"
    
    def generate_presigned_url(
        self, 
        object_key: str, 
        expiration: int = 3600,
        method: str = "get_object"
    ) -> Optional[str]:
        """
        Generate presigned URL untuk akses sementara ke file di R2
        
        Args:
            object_key: Key object di R2 (contoh: "raw/filename.png")
            expiration: Waktu expired dalam detik (default: 1 jam)
            method: Method S3 (get_object untuk download, put_object untuk upload)
            
        Returns:
            Presigned URL atau None jika R2 tidak aktif
        """
        if not self.r2_enabled or not self.s3_client:
            return None
        
        try:
            presigned_url = self.s3_client.generate_presigned_url(
                method,
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_key
                },
                ExpiresIn=expiration
            )
            return presigned_url
        except ClientError as e:
            print(f"✗ Error generating presigned URL: {e}")
            return None
    
    def generate_presigned_upload_url(
        self, 
        filename: str, 
        folder: str = "raw",
        expiration: int = 900
    ) -> Optional[dict]:
        """
        Generate presigned URL untuk upload langsung dari client
        
        Args:
            filename: Nama file yang akan diupload
            folder: Folder tujuan
            expiration: Waktu expired dalam detik (default: 15 menit)
            
        Returns:
            Dict dengan presigned URL dan informasi upload
        """
        if not self.r2_enabled or not self.s3_client:
            return None
        
        try:
            object_key = f"{folder}/{filename}"
            
            presigned_data = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=object_key,
                ExpiresIn=expiration
            )
            
            return {
                "url": presigned_data['url'],
                "fields": presigned_data['fields'],
                "object_key": object_key,
                "expires_in": expiration
            }
        except ClientError as e:
            print(f"✗ Error generating presigned upload URL: {e}")
            return None
    
    def generate_presigned_download_url(
        self, 
        object_key: str,
        expiration: int = 3600,
        filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Generate presigned URL untuk download file dari R2
        
        Args:
            object_key: Key object di R2
            expiration: Waktu expired dalam detik (default: 1 jam)
            filename: Nama file untuk download (optional)
            
        Returns:
            Presigned URL untuk download
        """
        if not self.r2_enabled or not self.s3_client:
            return None
        
        try:
            params = {
                'Bucket': self.bucket_name,
                'Key': object_key
            }
            
            # Tambahkan ResponseContentDisposition jika filename diberikan
            if filename:
                params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
            
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expiration
            )
            return presigned_url
        except ClientError as e:
            print(f"✗ Error generating presigned download URL: {e}")
            return None

# Instance global
r2_storage = R2Storage()
