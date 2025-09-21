const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");
const Producto = require("../models/Producto");
const TipoProducto = require("../models/TipoProducto");
const Favorito = require("../models/Favorito");
const Wishlist = require("../models/Wishlist");
const Notificacion = require("../models/Notificacion");
const Imagen = require("../models/Imagen");
const {
  verificarFirebaseAuth,
  verificarAdmin,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");
const fs = require("fs");
const path = require("path");

// Esquemas de validación
const esquemaCrearUsuario = Joi.object({
  nombre: Joi.string().required().max(100),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  rol: Joi.string().valid("CLIENTE", "ADMIN").default("CLIENTE"),
  telefono: Joi.string().max(20),
  direccion: Joi.string().max(200),
});

const esquemaActualizarRol = Joi.object({
  userId: Joi.string().required(),
  newRole: Joi.string().valid("CLIENTE", "ADMIN").required(),
});

const esquemaEliminarUsuario = Joi.object({
  userId: Joi.string().required(),
});

const esquemaEliminarProducto = Joi.object({
  productId: Joi.string().required(),
});

const esquemaMarcarNotificacion = Joi.object({
  activityId: Joi.string().required(),
});

// GET /api/admin/dashboard - Obtener datos del dashboard de administración
router.get(
  "/dashboard",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      // Estadísticas generales
      const [
        totalUsuarios,
        totalProductos,
        totalTiposProducto,
        totalFavoritos,
        totalWishlists,
        totalNotificaciones,
        totalImagenes,
      ] = await Promise.all([
        Usuario.countDocuments(),
        Producto.countDocuments({ activo: true }),
        TipoProducto.countDocuments({ activo: true }),
        Favorito.countDocuments({ activo: true }),
        Wishlist.countDocuments({ activa: true }),
        Notificacion.countDocuments(),
        Imagen.countDocuments({ activa: true }),
      ]);

      // Usuarios nuevos del mes
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const nuevosUsuariosMes = await Usuario.countDocuments({
        fechaRegistro: { $gte: inicioMes },
      });

      // Productos más vendidos (simulado con vistas)
      const productosMasVendidos = await Producto.find({ activo: true })
        .sort({ vistas: -1 })
        .limit(5)
        .select("nombre precio vistas")
        .populate("tipoProductoId", "nombre");

      // Tipos de producto más populares
      const tiposPopulares = await TipoProducto.aggregate([
        { $match: { activo: true } },
        {
          $lookup: {
            from: "productos",
            localField: "_id",
            foreignField: "tipoProductoId",
            as: "productos",
          },
        },
        {
          $project: {
            nombre: 1,
            totalProductos: { $size: "$productos" },
            totalVistas: { $sum: "$productos.vistas" },
          },
        },
        { $sort: { totalVistas: -1 } },
        { $limit: 5 },
      ]);

      // Notificaciones recientes
      const notificacionesRecientes = await Notificacion.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("usuarioId", "nombre email")
        .select("titulo mensaje tipo createdAt usuarioId");

      res.json({
        success: true,
        data: {
          estadisticas: {
            totalUsuarios,
            totalProductos,
            totalTiposProducto,
            totalFavoritos,
            totalWishlists,
            totalNotificaciones,
            totalImagenes,
            nuevosUsuariosMes,
          },
          productosMasVendidos,
          tiposPopulares,
          notificacionesRecientes,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/usuarios - Obtener lista de usuarios
router.get(
  "/usuarios",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { pagina = 1, limite = 20, busqueda, rol, activo } = req.query;

      const filtros = {};
      if (busqueda) {
        filtros.$or = [
          { nombre: new RegExp(busqueda, "i") },
          { email: new RegExp(busqueda, "i") },
        ];
      }
      if (rol) filtros.rol = rol;
      if (activo !== undefined) filtros.activo = activo === "true";

      const skip = (parseInt(pagina) - 1) * parseInt(limite);

      const usuarios = await Usuario.find(filtros)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limite));

      const total = await Usuario.countDocuments(filtros);

      res.json({
        success: true,
        data: usuarios,
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
  }
);

// GET /api/admin/productos - Obtener lista de productos
router.get(
  "/productos",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const {
        pagina = 1,
        limite = 20,
        busqueda,
        tipoProductoId,
        activo,
      } = req.query;

      const filtros = {};
      if (busqueda) {
        filtros.$or = [
          { nombre: new RegExp(busqueda, "i") },
          { descripcion: new RegExp(busqueda, "i") },
          { marca: new RegExp(busqueda, "i") },
        ];
      }
      if (tipoProductoId) filtros.tipoProductoId = tipoProductoId;
      if (activo !== undefined) filtros.activo = activo === "true";

      const skip = (parseInt(pagina) - 1) * parseInt(limite);

      const productos = await Producto.find(filtros)
        .populate("tipoProductoId", "nombre")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limite));

      const total = await Producto.countDocuments(filtros);

      res.json({
        success: true,
        data: productos,
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
  }
);

// GET /api/admin/notificaciones - Obtener notificaciones del sistema
router.get(
  "/notificaciones",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { pagina = 1, limite = 20, tipo, categoria } = req.query;

      const filtros = {};
      if (tipo) filtros.tipo = tipo;
      if (categoria) filtros.categoria = categoria;

      const skip = (parseInt(pagina) - 1) * parseInt(limite);

      const notificaciones = await Notificacion.find(filtros)
        .populate("usuarioId", "nombre email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limite));

      const total = await Notificacion.countDocuments(filtros);

      res.json({
        success: true,
        data: notificaciones,
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
  }
);

// GET /api/admin/estadisticas - Obtener estadísticas detalladas
router.get(
  "/estadisticas",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const estadisticas = await Promise.all([
        Usuario.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              activos: { $sum: { $cond: [{ $eq: ["$activo", true] }, 1, 0] } },
              admins: { $sum: { $cond: [{ $eq: ["$rol", "ADMIN"] }, 1, 0] } },
              clientes: {
                $sum: { $cond: [{ $eq: ["$rol", "CLIENTE"] }, 1, 0] },
              },
            },
          },
        ]),
        Producto.aggregate([
          { $match: { activo: true } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              precioPromedio: { $avg: "$precio" },
              precioMinimo: { $min: "$precio" },
              precioMaximo: { $max: "$precio" },
              totalStock: { $sum: "$stock" },
              productosDestacados: {
                $sum: { $cond: [{ $eq: ["$destacado", true] }, 1, 0] },
              },
              productosEnOferta: {
                $sum: { $cond: [{ $eq: ["$oferta.activa", true] }, 1, 0] },
              },
            },
          },
        ]),
        Favorito.aggregate([
          { $match: { activo: true } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              productosUnicos: { $addToSet: "$productoId" },
              usuariosUnicos: { $addToSet: "$usuarioId" },
            },
          },
          {
            $project: {
              total: 1,
              totalProductosUnicos: { $size: "$productosUnicos" },
              totalUsuariosUnicos: { $size: "$usuariosUnicos" },
            },
          },
        ]),
      ]);

      res.json({
        success: true,
        data: {
          usuarios: estadisticas[0][0] || {
            total: 0,
            activos: 0,
            admins: 0,
            clientes: 0,
          },
          productos: estadisticas[1][0] || {
            total: 0,
            precioPromedio: 0,
            precioMinimo: 0,
            precioMaximo: 0,
            totalStock: 0,
            productosDestacados: 0,
            productosEnOferta: 0,
          },
          favoritos: estadisticas[2][0] || {
            total: 0,
            totalProductosUnicos: 0,
            totalUsuariosUnicos: 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/logs - Obtener logs del sistema
router.get(
  "/logs",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      // En una implementación real, esto vendría de un sistema de logging
      const logs = [
        {
          timestamp: new Date(),
          level: "INFO",
          message: "Sistema iniciado correctamente",
          source: "server.js",
        },
        {
          timestamp: new Date(Date.now() - 300000),
          level: "INFO",
          message: "Nuevo usuario registrado",
          source: "auth.js",
        },
      ];

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/system-info - Obtener información del sistema
router.get(
  "/system-info",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        environment: process.env.NODE_ENV,
        timestamp: new Date(),
      };

      res.json({
        success: true,
        data: systemInfo,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/backup - Crear respaldo de la base de datos
router.post(
  "/backup",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      // En una implementación real, esto ejecutaría un comando de mongodump
      const backupInfo = {
        timestamp: new Date(),
        status: "completed",
        message: "Respaldo creado exitosamente",
        filename: `backup_${Date.now()}.tar.gz`,
      };

      res.json({
        success: true,
        data: backupInfo,
        message: "Respaldo de base de datos creado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/optimize - Optimizar base de datos
router.post(
  "/optimize",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      // En una implementación real, esto ejecutaría comandos de optimización
      const optimizationInfo = {
        timestamp: new Date(),
        status: "completed",
        message: "Base de datos optimizada exitosamente",
      };

      res.json({
        success: true,
        data: optimizationInfo,
        message: "Base de datos optimizada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/create-user - Crear nuevo usuario
router.post(
  "/create-user",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaCrearUsuario),
  async (req, res, next) => {
    try {
      const { nombre, email, password, rol, telefono, direccion } = req.body;

      // Verificar si el email ya existe
      const emailExistente = await Usuario.existeEmail(email);
      if (emailExistente) {
        return res.status(400).json({
          success: false,
          error: "El email ya está registrado",
        });
      }

      const usuario = new Usuario({
        nombre,
        email,
        password,
        rol,
        telefono,
        direccion,
      });

      await usuario.save();

      res.status(201).json({
        success: true,
        data: usuario.toPublicJSON(),
        message: "Usuario creado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/delete-user - Eliminar usuario
router.post(
  "/delete-user",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaEliminarUsuario),
  async (req, res, next) => {
    try {
      const { userId } = req.body;

      const usuario = await Usuario.findByIdAndUpdate(
        userId,
        { activo: false },
        { new: true }
      ).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
        message: "Usuario desactivado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/update-role - Actualizar rol de usuario
router.post(
  "/update-role",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaActualizarRol),
  async (req, res, next) => {
    try {
      const { userId, newRole } = req.body;

      const usuario = await Usuario.findByIdAndUpdate(
        userId,
        { rol: newRole },
        { new: true }
      ).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
        message: `Rol actualizado a ${newRole} exitosamente`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/delete-product - Eliminar producto
router.post(
  "/delete-product",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaEliminarProducto),
  async (req, res, next) => {
    try {
      const { productId } = req.body;

      const producto = await Producto.findByIdAndUpdate(
        productId,
        { activo: false },
        { new: true }
      );

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: "Producto no encontrado",
        });
      }

      res.json({
        success: true,
        data: producto,
        message: "Producto eliminado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/import-products - Importar productos
router.post(
  "/import-products",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { productos } = req.body;

      if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Se requiere una lista de productos válida",
        });
      }

      const productosCreados = [];
      const errores = [];

      for (const productoData of productos) {
        try {
          // Verificar que el tipo de producto existe
          const tipoProducto = await TipoProducto.findById(
            productoData.tipoProductoId
          );
          if (!tipoProducto) {
            errores.push(
              `Tipo de producto no encontrado para: ${productoData.nombre}`
            );
            continue;
          }

          const producto = new Producto(productoData);
          await producto.save();
          productosCreados.push(producto);
        } catch (error) {
          errores.push(
            `Error al crear producto ${productoData.nombre}: ${error.message}`
          );
        }
      }

      res.json({
        success: true,
        data: {
          creados: productosCreados.length,
          errores: errores.length,
          productos: productosCreados,
          errores,
        },
        message: `${productosCreados.length} productos importados exitosamente`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/export-catalog - Exportar catálogo
router.post(
  "/export-catalog",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const productos = await Producto.find({ activo: true })
        .populate("tipoProductoId", "nombre descripcion")
        .select("-__v");

      const catalogo = {
        timestamp: new Date(),
        totalProductos: productos.length,
        productos: productos,
      };

      res.json({
        success: true,
        data: catalogo,
        message: "Catálogo exportado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/mark-notification-read - Marcar notificación como leída
router.post(
  "/mark-notification-read",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaMarcarNotificacion),
  async (req, res, next) => {
    try {
      const { activityId } = req.body;

      const notificacion = await Notificacion.findByIdAndUpdate(
        activityId,
        { leida: true, fechaLeida: new Date() },
        { new: true }
      );

      if (!notificacion) {
        return res.status(404).json({
          success: false,
          error: "Notificación no encontrada",
        });
      }

      res.json({
        success: true,
        data: notificacion,
        message: "Notificación marcada como leída",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/mark-all-notifications-read - Marcar todas las notificaciones como leídas
router.post(
  "/mark-all-notifications-read",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const resultado = await Notificacion.updateMany(
        { leida: false },
        { leida: true, fechaLeida: new Date() }
      );

      res.json({
        success: true,
        data: {
          actualizadas: resultado.modifiedCount,
        },
        message: `${resultado.modifiedCount} notificaciones marcadas como leídas`,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

