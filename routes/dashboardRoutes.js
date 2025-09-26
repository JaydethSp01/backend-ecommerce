const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");
const Pedido = require("../models/Pedido");
const Favorito = require("../models/Favorito");
const Wishlist = require("../models/Wishlist");
const Notificacion = require("../models/Notificacion");
const {
  verificarAuth,
  verificarPropietario,
} = require("../middleware/authMiddleware");

// Endpoint de prueba para verificar Firebase
router.get("/test-firebase", async (req, res) => {
  try {
    const { initializeFirebase } = require("../middleware/authMiddleware");
    initializeFirebase();
    
    res.json({
      success: true,
      message: "Firebase test endpoint",
      timestamp: new Date().toISOString(),
      firebaseConfig: {
        projectId: process.env.FIREBASE_PROJECT_ID ? "Configurado" : "No configurado",
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? "Configurado" : "No configurado",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? "Configurado" : "No configurado"
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de prueba para verificar autenticación
router.get("/test-auth", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(" ")[1] : null;
    
    res.json({
      success: true,
      message: "Auth test endpoint",
      timestamp: new Date().toISOString(),
      auth: {
        header: authHeader ? "Presente" : "Ausente",
        token: token ? `${token.substring(0, 20)}...` : "No token",
        tokenLength: token ? token.length : 0
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/dashboard/stats/:userId - Obtener estadísticas del dashboard
router.get("/stats/:userId", verificarAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    
    // Verificar que el usuario existe
    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    // Obtener estadísticas básicas
    const totalPedidos = await Pedido.countDocuments({ usuarioId: userId });
    const totalGastado = await Pedido.aggregate([
      { $match: { usuarioId: userId, estado: "entregado" } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    
    const totalFavoritos = await Favorito.countDocuments({ usuarioId: userId });
    const totalWishlists = await Wishlist.countDocuments({ usuarioId: userId });
    const notificacionesNoLeidas = await Notificacion.countDocuments({ 
      usuarioId: userId, 
      leida: false 
    });

    // Calcular puntos de fidelidad (ejemplo: 1 punto por cada $10 gastados)
    const puntosFidelidad = Math.floor((totalGastado[0]?.total || 0) / 10);
    
    // Determinar nivel de usuario
    let nivelUsuario = "Bronze";
    let puntosSiguienteNivel = 100;
    
    if (puntosFidelidad >= 1000) {
      nivelUsuario = "Gold";
      puntosSiguienteNivel = 0;
    } else if (puntosFidelidad >= 500) {
      nivelUsuario = "Silver";
      puntosSiguienteNivel = 1000 - puntosFidelidad;
    } else {
      puntosSiguienteNivel = 500 - puntosFidelidad;
    }

    // Obtener categorías favoritas
    const categoriasFavoritas = await Favorito.aggregate([
      { $match: { usuarioId: userId } },
      { $lookup: {
          from: "productos",
          localField: "productoId",
          foreignField: "_id",
          as: "producto"
        }
      },
      { $unwind: "$producto" },
      { $lookup: {
          from: "tipoproductos",
          localField: "producto.tipoProductoId",
          foreignField: "_id",
          as: "tipoProducto"
        }
      },
      { $unwind: "$tipoProducto" },
      { $group: {
          _id: "$tipoProducto.nombre",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Obtener actividad reciente
    const actividadReciente = await Pedido.find({ usuarioId: userId })
      .sort({ fechaCreacion: -1 })
      .limit(5)
      .select("fechaCreacion estado total")
      .lean();

    const stats = {
      totalPurchases: totalPedidos,
      totalSpent: totalGastado[0]?.total || 0,
      loyaltyPoints: puntosFidelidad,
      userLevel: nivelUsuario,
      nextLevelPoints: puntosSiguienteNivel,
      activeDiscount: nivelUsuario === "Gold" ? "15%" : nivelUsuario === "Silver" ? "10%" : "5%",
      favoriteCategories: categoriasFavoritas.map(cat => cat._id),
      recentActivity: actividadReciente.map(act => ({
        id: act._id,
        type: "purchase",
        description: `Pedido ${act.estado} por $${act.total}`,
        date: act.fechaCreacion,
        productId: null
      })),
      totalFavorites: totalFavoritos,
      totalWishlists: totalWishlists,
      unreadNotifications: notificacionesNoLeidas
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/purchases/:userId - Obtener historial de compras
router.get("/purchases/:userId", verificarAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { pagina = 1, limite = 10 } = req.query;

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const pedidos = await Pedido.find({ usuarioId: userId })
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(parseInt(limite))
      .populate("productos.productoId", "nombre marca precio imagen")
      .lean();

    const total = await Pedido.countDocuments({ usuarioId: userId });

    const purchases = pedidos.map(pedido => ({
      id: pedido._id,
      date: pedido.fechaCreacion,
      total: pedido.total,
      status: pedido.estado,
      products: pedido.productos.map(item => ({
        id: item.productoId._id,
        nombre: item.productoId.nombre,
        marca: item.productoId.marca,
        precio: item.productoId.precio,
        imagen: item.productoId.imagen,
        cantidad: item.cantidad
      })),
      tracking: pedido.tracking || null,
      invoiceNumber: pedido.numeroFactura || `INV-${pedido._id.toString().slice(-8)}`
    }));

    res.json({
      success: true,
      data: purchases,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / parseInt(limite)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/analytics/:userId - Obtener analytics del usuario (solo admin o propio usuario)
router.get("/analytics/:userId", verificarAuth, verificarPropietario, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { periodo = "30d" } = req.query;

    // Calcular fechas según el período
    const fechaInicio = new Date();
    switch (periodo) {
      case "7d":
        fechaInicio.setDate(fechaInicio.getDate() - 7);
        break;
      case "30d":
        fechaInicio.setDate(fechaInicio.getDate() - 30);
        break;
      case "90d":
        fechaInicio.setDate(fechaInicio.getDate() - 90);
        break;
      case "1y":
        fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);
        break;
      default:
        fechaInicio.setDate(fechaInicio.getDate() - 30);
    }

    // Analytics de compras
    const analyticsCompras = await Pedido.aggregate([
      { $match: { 
          usuarioId: userId, 
          fechaCreacion: { $gte: fechaInicio } 
        }
      },
      { $group: {
          _id: {
            year: { $year: "$fechaCreacion" },
            month: { $month: "$fechaCreacion" },
            day: { $dayOfMonth: "$fechaCreacion" }
          },
          totalCompras: { $sum: 1 },
          totalGastado: { $sum: "$total" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    // Productos más comprados
    const productosMasComprados = await Pedido.aggregate([
      { $match: { 
          usuarioId: userId, 
          fechaCreacion: { $gte: fechaInicio } 
        }
      },
      { $unwind: "$productos" },
      { $group: {
          _id: "$productos.productoId",
          totalCompras: { $sum: "$productos.cantidad" },
          totalGastado: { $sum: { $multiply: ["$productos.precio", "$productos.cantidad"] } }
        }
      },
      { $lookup: {
          from: "productos",
          localField: "_id",
          foreignField: "_id",
          as: "producto"
        }
      },
      { $unwind: "$producto" },
      { $sort: { totalCompras: -1 } },
      { $limit: 10 }
    ]);

    // Horarios de compra más frecuentes
    const horariosCompras = await Pedido.aggregate([
      { $match: { 
          usuarioId: userId, 
          fechaCreacion: { $gte: fechaInicio } 
        }
      },
      { $group: {
          _id: { $hour: "$fechaCreacion" },
          totalCompras: { $sum: 1 }
        }
      },
      { $sort: { totalCompras: -1 } }
    ]);

    const analytics = {
      periodo,
      fechaInicio,
      compras: {
        totalCompras: analyticsCompras.reduce((sum, item) => sum + item.totalCompras, 0),
        totalGastado: analyticsCompras.reduce((sum, item) => sum + item.totalGastado, 0),
        promedioPorCompra: 0,
        tendencia: analyticsCompras
      },
      productosFavoritos: productosMasComprados,
      patronesCompras: {
        horariosMasFrecuentes: horariosCompras,
        diasSemana: [], // Se puede implementar si es necesario
      }
    };

    // Calcular promedio por compra
    if (analytics.compras.totalCompras > 0) {
      analytics.compras.promedioPorCompra = analytics.compras.totalGastado / analytics.compras.totalCompras;
    }

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/recommendations/:userId - Obtener recomendaciones personalizadas
router.get("/recommendations/:userId", verificarAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;

    // Obtener productos de favoritos del usuario
    const favoritos = await Favorito.find({ usuarioId: userId })
      .populate("productoId", "tipoProductoId marca")
      .lean();

    if (favoritos.length === 0) {
      // Si no tiene favoritos, devolver productos populares
      const productosPopulares = await require("../models/Producto").find()
        .sort({ "reviews.rating": -1 })
        .limit(5)
        .select("nombre marca precio imagen tipoProductoId")
        .lean();

      return res.json({
        success: true,
        data: {
          tipo: "populares",
          productos: productosPopulares,
          razon: "Productos populares para nuevos usuarios"
        }
      });
    }

    // Obtener tipos de producto y marcas favoritas
    const tiposFavoritos = [...new Set(favoritos.map(f => f.productoId.tipoProductoId?.toString()))];
    const marcasFavoritas = [...new Set(favoritos.map(f => f.productoId.marca))];

    // Buscar productos similares
    const productosSimilares = await require("../models/Producto").find({
      $or: [
        { tipoProductoId: { $in: tiposFavoritos } },
        { marca: { $in: marcasFavoritas } }
      ],
      _id: { $nin: favoritos.map(f => f.productoId._id) }
    })
    .limit(10)
    .select("nombre marca precio imagen tipoProductoId")
    .lean();

    res.json({
      success: true,
      data: {
        tipo: "personalizadas",
        productos: productosSimilares,
        razon: "Basado en tus favoritos y preferencias"
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
