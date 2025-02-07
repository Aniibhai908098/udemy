const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sanitizeFileName } = require('./utils');

class UdemyDownloader {
    constructor() {
        this.downloadQueue = [];
        this.isProcessingQueue = false;
        this.totalDownloaded = 0;
        this.totalErrors = 0;
    }

    async downloadCourse(courseUrl) {
        try {
            // Extract course ID from URL
            const courseId = this.extractCourseId(courseUrl);
            if (!courseId) {
                throw new Error('Invalid course URL');
            }

            // Get course details
            const courseDetails = await this.getCourseDetails(courseId);
            
            // Get course content
            const courseContent = await this.getCourseContent(courseId);

            // Create download directory
            const courseDir = path.join(__dirname, 'downloads', sanitizeFileName(courseDetails.title));
            if (!fs.existsSync(courseDir)) {
                fs.mkdirSync(courseDir, { recursive: true });
            }

            // Process videos
            const downloadPromises = courseContent.map(async (lecture, index) => {
                if (lecture.asset && lecture.asset.asset_type === "Video") {
                    const videoUrl = await this.getVideoUrl(lecture.id, courseId);
                    if (videoUrl) {
                        const fileName = `${String(index + 1).padStart(2, '0')}_${sanitizeFileName(lecture.title)}.mp4`;
                        await this.downloadVideo(videoUrl, path.join(courseDir, fileName));
                    }
                }
            });

            await Promise.all(downloadPromises);

            return {
                courseName: courseDetails.title,
                totalVideos: downloadPromises.length,
                downloadedVideos: this.totalDownloaded,
                errors: this.totalErrors
            };

        } catch (error) {
            console.error('Course download error:', error);
            throw error;
        }
    }

    async getCourseDetails(courseId) {
        try {
            const response = await axios.get(`https://www.udemy.com/api-2.0/courses/${courseId}`, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error('Failed to get course details');
        }
    }

    async getCourseContent(courseId) {
        try {
            const response = await axios.get(
                `https://www.udemy.com/api-2.0/courses/${courseId}/subscriber-curriculum-items?page_size=1400`,
                { headers: this.getHeaders() }
            );
            return response.data.results;
        } catch (error) {
            throw new Error('Failed to get course content');
        }
    }

    async getVideoUrl(lectureId, courseId) {
        try {
            const response = await axios.get(
                `https://www.udemy.com/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${lectureId}?fields[asset]=asset_type,stream_urls,download_urls`,
                { headers: this.getHeaders() }
            );

            const asset = response.data.asset;
            if (asset && asset.asset_type === "Video") {
                if (asset.stream_urls && asset.stream_urls.Video) {
                    return this.getHighestQualityUrl(asset.stream_urls.Video);
                }
                if (asset.download_urls && asset.download_urls.Video) {
                    return this.getHighestQualityUrl(asset.download_urls.Video);
                }
            }
            return null;
        } catch (error) {
            throw new Error('Failed to get video URL');
        }
    }

    async downloadVideo(url, filePath) {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } catch (error) {
            this.totalErrors++;
            throw new Error('Failed to download video');
        }
    }

    getHighestQualityUrl(videos) {
        return videos.reduce((highest, current) => {
            const currentQuality = parseInt((current.label || '').replace('p', '')) || 0;
            const highestQuality = parseInt((highest.label || '').replace('p', '')) || 0;
            return currentQuality > highestQuality ? current : highest;
        }).file;
    }

    getHeaders() {
        return {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json;charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    extractCourseId(url) {
        const match = url.match(/\/course\/[^\/]+(?:\/learn\/lecture\/(\d+)|\/(\d+))?/);
        return match ? match[1] || match[2] : null;
    }
}

module.exports = new UdemyDownloader();
