/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enables React Strict Mode for additional checks and debugging
    reactStrictMode: true,
    
    
    // Custom Webpack config for handling specific dependencies (like Nodemailer, etc.)
    webpack(config) {
      config.resolve.fallback = {
        fs: false, // Disable file system usage which isn't available in AWS Lambda
        path: false, // Similarly disable path module which is Node-specific
      };
      return config;
    },

  };
  
  export default nextConfig;
  