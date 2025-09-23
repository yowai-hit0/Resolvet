import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import expressOasGenerator from "express-oas-generator";
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import ticketRoutes from './routes/ticket.js'
import adminRoutes from './routes/admin.js';
import tagRoutes from './routes/tag.js';
import agentRoutes from './routes/agent.js';
import inviteRoutes from './routes/invite.js';

// Load env vars
dotenv.config();

const app = express();

expressOasGenerator.init(app, {
  swaggerDocumentOptions: {
    openapi: "3.0.0",
    info: {
      title: "Resolvet Express APIs",
      version: "1.0.1",
      description: "Auto-generated API docs with Swagger + Redoc",
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 3001}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});


app.use(helmet());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/admin', adminRoutes); 
app.use('/api/v1/agent', agentRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/invites', inviteRoutes);
// app.use('/api/v1/customer', customerRoutes)
// Health check endpoints
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Render/Platform health checks often call /health and HEAD /health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});
app.head('/health', (req, res) => {
  res.status(200).end();
});

// Basic root route to avoid 404 on '/'
app.get('/', (req, res) => {
  res.status(200).json({ name: 'Resolvet API', version: '1.0.1' });
});

expressOasGenerator.handleResponses(app, {
  alwaysServeDocs: true, 
  specOutputPath: "./openapi.json",
  swaggerUiServePath: "/api-docs", 
  redocUiServePath: "/redoc",     
  security: [{ bearerAuth: [] }],
  excludeRoutes: [
    "/api/v1/auth/login",
    "/api/v1/auth/register",
  ],
});

// Error handling middleware
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});