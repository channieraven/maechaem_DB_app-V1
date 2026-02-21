
// 1. ใส่ Cloud Name จาก Dashboard ของคุณตรงนี้
const CLOUD_NAME = 'dmd0ca16b'; // <-- เปลี่ยนเป็นชื่อ Cloud Name ของคุณ (เช่น dyabc123)

// 2. ใส่ Upload Preset ที่ตั้งค่าเป็น "Unsigned" ตรงนี้
const UPLOAD_PRESET = 'maechaem_database'; // <-- เปลี่ยนเป็นชื่อ Preset ของคุณ (ต้องสร้างใน Settings > Upload > Add upload preset > Signing Mode: Unsigned)

export const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  // Optional: จัดหมวดหมู่ใน Cloudinary
  formData.append('folder', 'maechaem_forest'); 

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    // คืนค่าเป็น URL แบบ HTTPS ที่พร้อมใช้งานทันที
    return data.secure_url; 
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};
