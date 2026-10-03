// frontend/js/config.js
// Central configuration

const CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api',
  UPLOADS_BASE_URL: 'http://localhost:5000'
};

// Agar production me deploy karo toh ye change karna
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  // Deploy ke waqt Render URL daalna
  // CONFIG.API_BASE_URL = 'https://your-backend.onrender.com/api';
  // CONFIG.UPLOADS_BASE_URL = 'https://your-backend.onrender.com';
}