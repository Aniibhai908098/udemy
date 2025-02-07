function sanitizeFileName(name) {
    if (!name) return 'unnamed_file';
    
    let cleanName = name
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (cleanName.length > 50) {
        cleanName = cleanName.substring(0, 47) + '...';
    }

    cleanName = cleanName.replace(/^[\s.]+/, '');

    return cleanName || 'unnamed_file';
}

function validateUrl(url) {
    try {
        const urlObject = new URL(url);
        return urlObject.hostname.includes('udemy.com') && url.includes('/course/');
    } catch {
        return false;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
    sanitizeFileName,
    validateUrl,
    formatBytes
};
