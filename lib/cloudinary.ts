import axios from 'axios';

export async function uploadToCloudinary(file:File) {
    
    const {data:sig} = await axios.post("/api/upload/signature");

    const formData = new FormData();
    formData.append("file",file);
    formData.append("api_key",sig.api_key);
    formData.append("timestamp", sig.timestamp);
  formData.append("signature", sig.signature);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

  const { data } = await axios.post(uploadUrl, formData);

  return {
    url: data.secure_url,
    public_id: data.public_id,
  };
}