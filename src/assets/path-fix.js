/**
 * Emergency path fixer for Electron apps
 * This script can be used to fix file path issues when the app can't load resources
 * It's designed to be small and self-contained so it can be loaded even when other scripts fail
 */
(function() {

  // Get application resources path
  const getAppPath = function() {
    // Get the current script's path
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    const currentPath = currentScript.src || '';
    
    // Extract the base path up to /dist/ or assets/
    let basePath = '';
    if (currentPath.includes('/assets/')) {
      basePath = currentPath.substring(0, currentPath.indexOf('/assets/'));
    } else if (currentPath.includes('/dist/')) {
      basePath = currentPath.substring(0, currentPath.indexOf('/dist/') + 5);
    } else {
      // Fallback - use the directory of the current URL
      basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    }
    
    return basePath;
  };

  // Fix resource paths
  const fixResourcePaths = function() {
    const appPath = getAppPath();
    
    // Function to fix a specific file URL
    const fixPath = function(url) {
      if (!url) return url;
      
      // Skip URLs that don't need fixing
      if (url.startsWith('https://') || url.startsWith('http://')) return url;
      
      // Fix URLs that start with file:///D:/ or similar
      if (url.match(/^file:\/\/\/[A-Za-z]:\//)) {
        const filename = url.split('/').pop();
        return `${appPath}/${filename}`;
      }
      
      // Fix absolute URLs that start with /
      if (url.startsWith('/') && !url.startsWith('//')) {
        return `${appPath}${url}`;
      }
      
      // Fix relative URLs
      if (url.startsWith('./')) {
        return `${appPath}/${url.substring(2)}`;
      }
      
      return url;
    };
    
    // Fix script src attributes
    document.querySelectorAll('script[src]').forEach(script => {
      const src = script.getAttribute('src');
      const newSrc = fixPath(src);
      if (src !== newSrc) {
        script.setAttribute('src', newSrc);
      }
    });
    
    // Fix link href attributes
    document.querySelectorAll('link[href]').forEach(link => {
      const href = link.getAttribute('href');
      const newHref = fixPath(href);
      if (href !== newHref) {
        link.setAttribute('href', newHref);
      }
    });
    
    // Fix CDN URLs 
    document.querySelectorAll('link[href^="//"]').forEach(link => {
      const href = link.getAttribute('href');
      link.setAttribute('href', 'https:' + href);
    });
    
    // Create a new base tag or update existing one
    let baseTag = document.querySelector('base');
    if (!baseTag) {
      baseTag = document.createElement('base');
      document.head.insertBefore(baseTag, document.head.firstChild);
    }
    baseTag.setAttribute('href', appPath + '/');
    
    // Try to inject a fetch polyfill
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string') {
        url = fixPath(url);
      }
      return originalFetch(url, options);
    };
    
  };
  
  // Run the path fixer immediately
  fixResourcePaths();
  
  // Also run it after DOMContentLoaded event
  if (document.readyState !== 'loading') {
    fixResourcePaths();
  } else {
    document.addEventListener('DOMContentLoaded', fixResourcePaths);
  }
})(); 