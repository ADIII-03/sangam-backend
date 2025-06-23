import cloudinary from "../db/cloudinary.js";

export const uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "posts",
      resource_type: "image",
    });
      return { url: result.secure_url, public_id: result.public_id };;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw new Error("Image upload failed");
  }
};

export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw new Error("Image deletion failed");
  }
};

export const uploadVideo = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "posts",
      resource_type: "video",
    });
    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error("Error uploading video to Cloudinary:", error);
    throw new Error("Video upload failed");
  }
};

export const deleteVideo = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
  } catch (error) {
    console.error("Error deleting video from Cloudinary:", error);
    throw new Error("Video deletion failed");
  }
};

export const uploadFile = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "posts",
      resource_type: "raw",
    });
    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    throw new Error("File upload failed");
  }
};

export const deleteFile = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
    });
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    throw new Error("File deletion failed");
  }
};



