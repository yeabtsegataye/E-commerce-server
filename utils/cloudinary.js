const cloudinary = require('cloudinary').v2;

// Fallback to hardcoded values if env vars not loaded yet
const getCloudinaryConfig = () => {
  // Try environment variables first
  const envConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  };
  
  // If environment variables are missing, use hardcoded values
  if (!envConfig.cloud_name || !envConfig.api_key || !envConfig.api_secret) {
    console.log('⚠️  Using hardcoded Cloudinary config (env vars not loaded yet)');
    return {
      cloud_name: 'yeabtsega',
      api_key: '342624127693185',
      api_secret: '3LYphzYmZkf6_6h6X2bfwjffuww'
    };
  }
  
  console.log('✅ Using Cloudinary config from environment variables');
  return envConfig;
};

// Configure Cloudinary
const config = getCloudinaryConfig();
cloudinary.config({
  cloud_name: config.cloud_name,
  api_key: config.api_key,
  api_secret: config.api_secret,
  secure: true
});

console.log('Cloudinary configured with cloud_name:', config.cloud_name);

/**
 * Upload image to Cloudinary
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(new Error('Invalid image buffer'));
    }

    const uploadOptions = {
      folder: 'ecommerce-items',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      resource_type: 'auto',
      ...options
    };

    console.log('📤 Uploading to Cloudinary...');
    
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error.message);
          reject(error);
        } else {
          console.log('✅ Upload successful:', result.public_id);
          resolve(result);
        }
      }
    );

    uploadStream.on('error', (error) => {
      console.error('❌ Stream error:', error);
      reject(error);
    });

    uploadStream.end(buffer);
  });
};

/**
 * Delete image from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  cloudinary
};