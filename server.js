const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import routes
const productoRoutes = require("./routes/productoRoutes");
const tipoProductoRoutes = require("./routes/tipoProductoRoutes");
const imagenRoutes = require("./routes/imagenRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const favoritoRoutes = require("./routes/favoritoRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const notificacionRoutes = require("./routes/notificacionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const pedidoRoutes = require("./routes/pedidoRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

// Import middleware
const errorHandler = require("./middleware/errorHandler");
const { initializeFirebase } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy para Render (necesario para rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// CORS configuration - Allow all origins for development
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["X-Total-Count", "X-Page-Count"],
    optionsSuccessStatus: 200, // For legacy browser support
  })
);

// Handle preflight requests
app.options("*", cors());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir archivos estáticos
app.use("/uploads", express.static("uploads"));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// MongoDB connection
const connectDB = async () => {
  try {
    // Para desarrollo, usar MongoDB en memoria o local
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/tekashi_shoes";

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    console.log("🔄 Trying to continue without database...");
    // No salir del proceso, continuar sin base de datos para desarrollo
  }
};

connectDB();

// Inicializar Firebase después de conectar a la base de datos
initializeFirebase();

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Debug endpoint
app.get("/api/debug", (req, res) => {
  res.json({
    message: "Debug endpoint working",
    timestamp: new Date().toISOString(),
    mongooseState: mongoose.connection.readyState,
    env: process.env.NODE_ENV,
    mongodbUri: process.env.MONGODB_URI ? "Set" : "Not set"
  });
});

// Simple test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Test OK", time: new Date().toISOString() });
});

// Ultra simple endpoint
app.get("/api/simple", (req, res) => {
  res.json({ ok: true });
});

// Debug endpoint simple sin base de datos
app.get("/api/debug", (req, res) => {
  res.json({
    success: true,
    debug: {
      connectionState: mongoose.connection.readyState,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      mongodbUri: process.env.MONGODB_URI ? "Set" : "Not set",
    },
  });
});

// Endpoint de diagnóstico para productos sin base de datos
app.get("/api/producto/test", (req, res) => {
  res.json({
    success: true,
    message: "Producto endpoint funcionando",
    timestamp: new Date().toISOString(),
    connectionState: mongoose.connection.readyState
  });
});

// API Routes
app.use("/api/producto", productoRoutes);
app.use("/api/tipo_producto", tipoProductoRoutes);
app.use("/api/imagenes", imagenRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/favoritos", favoritoRoutes);
app.use("/api/wishlists", wishlistRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/reviews", reviewRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Tekashi Shoes API",
    version: "1.0.0",
    endpoints: {
      productos: "/api/producto",
      tiposProducto: "/api/tipo_producto",
      imagenes: "/api/imagenes",
      usuarios: "/api/usuarios",
      favoritos: "/api/favoritos",
      wishlists: "/api/wishlists",
      notificaciones: "/api/notificaciones",
      admin: "/api/admin",
      pedidos: "/api/pedidos",
      reviews: "/api/reviews",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `The requested endpoint ${req.originalUrl} does not exist`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
  }
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
});

module.exports = app;
