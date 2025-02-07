const express = require('express');
const cors = require('cors');
const path = require('path');
const { downloadCourse } = require('./udemyDownloader');
const { sanitizeFileName, validateUrl } = require('./utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.post('/api/download', async (req, res) => {
    try {
        const { courseUrl } = req.body;

        // Validate URL
        if (!validateUrl(courseUrl)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid Udemy course URL' 
            });
        }

        // Start download process
        const downloadResult = await downloadCourse(courseUrl);

        res.json({
            success: true,
            data: downloadResult
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to download course'
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
