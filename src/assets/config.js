// Configuration settings for the application
(function() {
  // Provide default configuration settings
  window.appConfig = {
   
    // Environment settings (development, staging, production)
    environment: 'development',
    
    // Feature flags
    features: {
      darkMode: true,
      experimental: false
    },
    
    // Authentication settings
    auth: {
      clientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
      redirectUri: 'http://localhost',
      authority: 'https://login.microsoftonline.com/common'
    },
    
    // Default app settings
    defaults: {
      theme: 'light',
      language: 'en'
    }
  };
  
  console.log('[CONFIG] Configuration loaded successfully');
})(); 