"""
DICOM Parser Utility
====================
Ekstrak metadata pasien dari file DICOM secara otomatis.
Zero-Typing Workflow: File DICOM → Auto Extract → Create/Update Patient Profile
"""

import pydicom
from typing import Dict, Optional, Any
from datetime import datetime
import io


def is_dicom_file(file_content: bytes) -> bool:
    """
    Check apakah file adalah DICOM format dengan membaca preamble dan prefix
    
    Args:
        file_content: Bytes content dari file
        
    Returns:
        True jika DICOM, False jika bukan
    """
    try:
        # DICOM file format: 128 bytes preamble + 'DICM' prefix
        if len(file_content) < 132:
            return False
        
        # Check DICM prefix at byte 128-131
        dicm_prefix = file_content[128:132]
        return dicm_prefix == b'DICM'
    except Exception as e:
        print(f"Error checking DICOM format: {e}")
        return False


def extract_dicom_metadata(file_content: bytes) -> Optional[Dict[str, Any]]:
    """
    Extract metadata pasien dari file DICOM
    
    Args:
        file_content: Bytes content dari file DICOM
        
    Returns:
        Dictionary dengan metadata pasien atau None jika gagal
        
    Structure:
    {
        "patient_id": str,           # (0010,0020) Patient ID - KUNCI UTAMA
        "patient_name": str,         # (0010,0010) Patient Name
        "patient_birth_date": str,   # (0010,0030) Patient Birth Date (YYYYMMDD)
        "patient_sex": str,          # (0010,0040) Patient Sex (M/F/O)
        "patient_age": str,          # (0010,1010) Patient Age (optional)
        "study_date": str,           # (0008,0020) Study Date (YYYYMMDD)
        "study_time": str,           # (0008,0030) Study Time
        "study_description": str,    # (0008,1030) Study Description
        "modality": str,             # (0008,0060) Modality (MG = Mammography)
        "institution_name": str,     # (0008,0080) Institution Name
        "manufacturer": str,         # (0008,0070) Manufacturer
        "series_description": str,   # (0008,103E) Series Description
        "body_part_examined": str,   # (0018,0015) Body Part Examined
        "view_position": str,        # (0018,5101) View Position (CC, MLO, etc)
        "laterality": str,           # (0020,0060) Laterality (R/L - Right/Left)
        "rows": int,                 # (0028,0010) Image Rows
        "columns": int,              # (0028,0011) Image Columns
        "is_dicom": bool             # Flag bahwa ini DICOM file
    }
    """
    try:
        # Load DICOM file dari bytes
        dicom_file = pydicom.dcmread(io.BytesIO(file_content))
        
        # Helper function untuk safely get DICOM tag value
        def get_tag(tag_name: str, default: str = "") -> str:
            try:
                value = getattr(dicom_file, tag_name, default)
                if value is None:
                    return default
                # Convert to string and clean up
                return str(value).strip()
            except Exception:
                return default
        
        # Extract patient metadata (MANDATORY TAGS)
        patient_id = get_tag("PatientID", "")
        patient_name = get_tag("PatientName", "")
        
        # Jika Patient ID atau Name kosong, gunakan fallback
        if not patient_id:
            # Generate Patient ID dari timestamp jika tidak ada
            patient_id = f"DICOM-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        if not patient_name:
            patient_name = f"Patient {patient_id}"
        
        # Format patient name (DICOM format: LastName^FirstName^MiddleName)
        if "^" in patient_name:
            name_parts = patient_name.split("^")
            # Combine as: FirstName MiddleName LastName
            patient_name = " ".join([p for p in name_parts if p]).strip()
        
        # Extract additional metadata
        birth_date = get_tag("PatientBirthDate", "")  # YYYYMMDD
        sex = get_tag("PatientSex", "")  # M/F/O
        age = get_tag("PatientAge", "")  # e.g., "045Y" (45 years)
        
        # Study information
        study_date = get_tag("StudyDate", "")  # YYYYMMDD
        study_time = get_tag("StudyTime", "")  # HHMMSS
        study_desc = get_tag("StudyDescription", "")
        
        # Modality and equipment
        modality = get_tag("Modality", "")  # MG = Mammography
        institution = get_tag("InstitutionName", "")
        manufacturer = get_tag("Manufacturer", "")
        
        # Series and image info
        series_desc = get_tag("SeriesDescription", "")
        body_part = get_tag("BodyPartExamined", "")
        view_position = get_tag("ViewPosition", "")  # CC, MLO, etc
        laterality = get_tag("Laterality", "")  # R (Right) or L (Left)
        
        # Image dimensions
        rows = int(get_tag("Rows", "0"))
        columns = int(get_tag("Columns", "0"))
        
        # Format dates untuk display
        formatted_birth_date = None
        if birth_date and len(birth_date) == 8:
            try:
                formatted_birth_date = datetime.strptime(birth_date, "%Y%m%d").strftime("%Y-%m-%d")
            except:
                pass
        
        formatted_study_date = None
        if study_date and len(study_date) == 8:
            try:
                formatted_study_date = datetime.strptime(study_date, "%Y%m%d").strftime("%Y-%m-%d")
            except:
                pass
        
        metadata = {
            # Patient Demographics (KUNCI UTAMA)
            "patient_id": patient_id,
            "patient_name": patient_name,
            "patient_birth_date": birth_date,
            "patient_birth_date_formatted": formatted_birth_date,
            "patient_sex": sex,
            "patient_age": age,
            
            # Study Information
            "study_date": study_date,
            "study_date_formatted": formatted_study_date,
            "study_time": study_time,
            "study_description": study_desc,
            
            # Equipment & Institution
            "modality": modality,
            "institution_name": institution,
            "manufacturer": manufacturer,
            
            # Image Details
            "series_description": series_desc,
            "body_part_examined": body_part,
            "view_position": view_position,  # CC, MLO, ML, LM, etc
            "laterality": laterality,  # R (Kanan) / L (Kiri)
            "rows": rows,
            "columns": columns,
            
            # Flags
            "is_dicom": True
        }
        
        return metadata
        
    except pydicom.errors.InvalidDicomError:
        print("Error: File bukan format DICOM yang valid")
        return None
    except Exception as e:
        print(f"Error extracting DICOM metadata: {e}")
        import traceback
        traceback.print_exc()
        return None


def convert_dicom_to_image(file_content: bytes) -> Optional[bytes]:
    """
    Convert DICOM pixel data ke PIL Image dan return sebagai PNG bytes
    
    Args:
        file_content: Bytes content dari file DICOM
        
    Returns:
        PNG image bytes atau None jika gagal
    """
    try:
        from PIL import Image
        import numpy as np
        
        # Load DICOM file
        dicom_file = pydicom.dcmread(io.BytesIO(file_content))
        
        # Get pixel array
        pixel_array = dicom_file.pixel_array
        
        # Normalize pixel values ke 0-255 range
        pixel_array = pixel_array.astype(np.float32)
        pixel_min = pixel_array.min()
        pixel_max = pixel_array.max()
        
        if pixel_max > pixel_min:
            pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
        else:
            pixel_array = pixel_array.astype(np.uint8)
        
        # Convert to PIL Image
        image = Image.fromarray(pixel_array)
        
        # Convert ke PNG bytes
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        return buffer.getvalue()
        
    except Exception as e:
        print(f"Error converting DICOM to image: {e}")
        import traceback
        traceback.print_exc()
        return None


def generate_patient_id_from_dicom(metadata: Dict[str, Any]) -> str:
    """
    Generate atau ambil Patient ID dari metadata DICOM
    
    Args:
        metadata: Dictionary hasil extract_dicom_metadata()
        
    Returns:
        Patient ID string (format: PAT-{timestamp} atau dari DICOM PatientID)
    """
    patient_id = metadata.get("patient_id", "")
    
    if patient_id and patient_id != "":
        # Clean patient ID (remove special characters, max 50 chars)
        patient_id = "".join(c for c in patient_id if c.isalnum() or c in ["-", "_"])[:50]
        return patient_id
    
    # Fallback: Generate dari timestamp
    return f"PAT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
