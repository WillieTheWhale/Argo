// Argo Phase 3 - Backend API Server
// Production-ready implementation with WebSocket support

require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { Pool } = require('pg');
const redis = require('redis');
const crypto = require('crypto');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis connection for caching
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

// WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });
const wsClients = new Set();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const uploadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // limit each IP to 5 uploads per window
    message: 'Too many uploads, please try again later'
});

const reactionLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit reactions
    message: 'Too many reactions, please slow down'
});

// Helper Functions
async function moderateImage(imageBuffer) {
    // In production, integrate with AI moderation service
    // For now, basic checks
    const imageStats = await sharp(imageBuffer).stats();
    
    // Check if image is mostly blank
    const isBlank = imageStats.channels.every(channel => 
        channel.mean < 10 || channel.mean > 245
    );
    
    return {
        approved: !isBlank,
        reason: isBlank ? 'Image appears to be blank' : null
    };
}

function generateImageHash(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
}

async function checkDuplicateImage(hash) {
    const result = await pool.query(
        'SELECT id FROM doodles WHERE image_hash = $1 AND created_at > NOW() - INTERVAL \'24 hours\'',
        [hash]
    );
    return result.rows.length > 0;
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    const clientId = uuidv4();
    ws.clientId = clientId;
    wsClients.add(ws);
    
    console.log(`WebSocket client connected: ${clientId}`);
    
    // Send initial data
    ws.send(JSON.stringify({
        type: 'connected',
        clientId: clientId,
        totalClients: wsClients.size
    }));
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                    
                case 'subscribe':
                    ws.subscriptions = data.channels || ['doodles'];
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        wsClients.delete(ws);
        console.log(`WebSocket client disconnected: ${clientId}`);
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
    });
});

// Broadcast to all WebSocket clients
function broadcast(data, channel = 'doodles') {
    const message = JSON.stringify(data);
    
    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            if (!client.subscriptions || client.subscriptions.includes(channel)) {
                client.send(message);
            }
        }
    });
}

// API Routes

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        wsClients: wsClients.size
    });
});

// Get doodles with pagination
app.get('/api/doodles', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const sort = req.query.sort || 'recent'; // recent, popular, featured
        
        let query = `
            SELECT 
                id,
                image_url,
                user_name,
                waitlist_position,
                reactions,
                is_featured,
                created_at
            FROM doodles
            WHERE moderation_status = 'approved'
        `;
        
        // Add sorting
        switch (sort) {
            case 'popular':
                query += ` ORDER BY (reactions->>'like')::int + (reactions->>'love')::int + 
                          (reactions->>'fire')::int + (reactions->>'laugh')::int DESC`;
                break;
            case 'featured':
                query += ` ORDER BY is_featured DESC, created_at DESC`;
                break;
            default:
                query += ` ORDER BY created_at DESC`;
        }
        
        query += ` LIMIT $1 OFFSET $2`;
        
        // Try to get from cache first
        const cacheKey = `doodles:${sort}:${page}:${limit}`;
        const cached = await redisClient.get(cacheKey);
        
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        
        // Query database
        const result = await pool.query(query, [limit, offset]);
        
        // Get total count
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM doodles WHERE moderation_status = \'approved\''
        );
        const total = parseInt(countResult.rows[0].count);
        
        const response = {
            doodles: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: offset + limit < total
            }
        };
        
        // Cache for 1 minute
        await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
        
        res.json(response);
    } catch (error) {
        console.error('Error fetching doodles:', error);
        res.status(500).json({ error: 'Failed to fetch doodles' });
    }
});

// Upload new doodle
app.post('/api/doodles', uploadLimiter, async (req, res) => {
    try {
        const { imageData, userName, sessionId } = req.body;
        
        if (!imageData) {
            return res.status(400).json({ error: 'Image data required' });
        }
        
        // Extract base64 data
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Check file size (max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image too large (max 5MB)' });
        }
        
        // Process and optimize image
        const processedBuffer = await sharp(buffer)
            .resize(400, 400, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png({ quality: 80 })
            .toBuffer();
        
        // Generate hash and check for duplicates
        const imageHash = generateImageHash(processedBuffer);
        const isDuplicate = await checkDuplicateImage(imageHash);
        
        if (isDuplicate) {
            return res.status(400).json({ error: 'Duplicate image detected' });
        }
        
        // Moderate image
        const moderation = await moderateImage(processedBuffer);
        
        // Generate unique filename
        const filename = `${uuidv4()}.png`;
        const imageUrl = `/uploads/${filename}`;
        
        // In production, upload to CDN/S3
        // For now, save locally
        const fs = require('fs').promises;
        const uploadDir = path.join(__dirname, 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(path.join(uploadDir, filename), processedBuffer);
        
        // Get waitlist position (mock)
        const waitlistPosition = Math.floor(Math.random() * 25000) + 1;
        
        // Save to database
        const result = await pool.query(
            `INSERT INTO doodles (
                id, image_url, image_hash, user_name, session_id,
                waitlist_position, moderation_status, reactions
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                uuidv4(),
                imageUrl,
                imageHash,
                userName || 'Anonymous',
                sessionId || uuidv4(),
                waitlistPosition,
                moderation.approved ? 'approved' : 'pending',
                JSON.stringify({ like: 0, love: 0, fire: 0, laugh: 0 })
            ]
        );
        
        const doodle = result.rows[0];
        
        // Broadcast to WebSocket clients if approved
        if (moderation.approved) {
            broadcast({
                type: 'new_doodle',
                data: doodle
            });
        }
        
        // Clear cache
        await redisClient.del('doodles:*');
        
        res.json({
            success: true,
            doodle: {
                id: doodle.id,
                imageUrl: doodle.image_url,
                waitlistPosition: doodle.waitlist_position,
                moderationStatus: doodle.moderation_status
            }
        });
    } catch (error) {
        console.error('Error uploading doodle:', error);
        res.status(500).json({ error: 'Failed to upload doodle' });
    }
});

// Add reaction to doodle
app.post('/api/doodles/:id/react', reactionLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const { reaction } = req.body;
        const clientIp = req.ip;
        
        const validReactions = ['like', 'love', 'fire', 'laugh'];
        if (!validReactions.includes(reaction)) {
            return res.status(400).json({ error: 'Invalid reaction type' });
        }
        
        // Check if user already reacted
        const existingReaction = await pool.query(
            'SELECT id FROM reactions WHERE doodle_id = $1 AND ip_address = $2 AND reaction_type = $3',
            [id, clientIp, reaction]
        );
        
        if (existingReaction.rows.length > 0) {
            return res.status(400).json({ error: 'Already reacted' });
        }
        
        // Add reaction
        await pool.query(
            'INSERT INTO reactions (id, doodle_id, reaction_type, ip_address) VALUES ($1, $2, $3, $4)',
            [uuidv4(), id, reaction, clientIp]
        );
        
        // Update doodle reaction count
        const updateQuery = `
            UPDATE doodles 
            SET reactions = jsonb_set(
                reactions,
                '{${reaction}}',
                (COALESCE((reactions->>'${reaction}')::int, 0) + 1)::text::jsonb
            ),
            updated_at = NOW()
            WHERE id = $1
            RETURNING reactions
        `;
        
        const result = await pool.query(updateQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Doodle not found' });
        }
        
        // Broadcast update
        broadcast({
            type: 'reaction_update',
            data: {
                doodleId: id,
                reactions: result.rows[0].reactions
            }
        });
        
        // Clear cache
        await redisClient.del('doodles:*');
        
        res.json({
            success: true,
            reactions: result.rows[0].reactions
        });
    } catch (error) {
        console.error('Error adding reaction:', error);
        res.status(500).json({ error: 'Failed to add reaction' });
    }
});

// Get featured doodles
app.get('/api/doodles/featured', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM doodles 
             WHERE is_featured = true AND moderation_status = 'approved'
             ORDER BY created_at DESC
             LIMIT 6`
        );
        
        res.json({
            doodles: result.rows
        });
    } catch (error) {
        console.error('Error fetching featured doodles:', error);
        res.status(500).json({ error: 'Failed to fetch featured doodles' });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_doodles,
                COUNT(DISTINCT session_id) as unique_artists,
                SUM((reactions->>'like')::int + (reactions->>'love')::int + 
                    (reactions->>'fire')::int + (reactions->>'laugh')::int) as total_reactions
            FROM doodles
            WHERE moderation_status = 'approved'
        `);
        
        res.json({
            totalDoodles: parseInt(stats.rows[0].total_doodles),
            uniqueArtists: parseInt(stats.rows[0].unique_artists),
            totalReactions: parseInt(stats.rows[0].total_reactions) || 0,
            activeConnections: wsClients.size
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Serve uploaded images (in production, use CDN)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Database initialization
async function initDatabase() {
    try {
        // Create tables if they don't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS doodles (
                id UUID PRIMARY KEY,
                image_url TEXT NOT NULL,
                image_hash VARCHAR(32),
                user_name VARCHAR(50),
                session_id UUID NOT NULL,
                waitlist_position INTEGER,
                reactions JSONB DEFAULT '{"like":0,"love":0,"fire":0,"laugh":0}',
                is_featured BOOLEAN DEFAULT false,
                moderation_status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reactions (
                id UUID PRIMARY KEY,
                doodle_id UUID REFERENCES doodles(id) ON DELETE CASCADE,
                reaction_type VARCHAR(20),
                ip_address INET,
                session_id UUID,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(doodle_id, ip_address, reaction_type)
            )
        `);
        
        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_doodles_created ON doodles(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_doodles_featured ON doodles(is_featured) WHERE is_featured = true;
            CREATE INDEX IF NOT EXISTS idx_doodles_moderation ON doodles(moderation_status);
            CREATE INDEX IF NOT EXISTS idx_doodles_hash ON doodles(image_hash);
        `);
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
}

// Start server
async function startServer() {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`API Server running on port ${PORT}`);
        console.log(`WebSocket Server running on port ${WS_PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    
    // Close WebSocket connections
    wsClients.forEach(client => {
        client.close();
    });
    wss.close();
    
    // Close database connections
    await pool.end();
    await redisClient.quit();
    
    process.exit(0);
});

// Start the server
startServer().catch(console.error);

module.exports = app; // For testing