const express = require("express");
const router = express.Router();
const Favorito = require("../models/Favorito");
const Producto = require("../models/Producto");
const {
  verificarAuth,
  verificarPropietario,
  autenticacionOpcional,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");

// Esquemas de validación
const esquemaFavorito = Joi.object({
  productoId: Joi.string().required(),
  notas: Joi.string().max(500),
  prioridad: Joi.number().min(1).max(5).default(3),
  notificarOferta: Joi.boolean().default(true),
  notificarStock: Joi.boolean().default(true),
});

// GET /api/favoritos - Obtener favoritos del usuario autenticado
router.get("/", autenticacionOpcional, async (req, res, next) => {
  try {
    // Si no hay usuario autenticado, retornar array vacío para modo invitado
    if (!req.usuario || !req.usuario._id) {
      return res.json({
        success: true,
        data: [],
        paginacion: {
          pagina: 1,
          limite: 20,
          total: 0,
          paginas: 0,
        },
        message: "Modo invitado - favoritos no disponibles",
      });
    }

    const { pagina = 1, limite = 20, ordenar = "fechaAgregado" } = req.query;

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const favoritos = await Favorito.obtenerFavoritosUsuario(req.usuario._id, {
      limite: parseInt(limite),
      desplazamiento: skip,
    });

    const total = await Favorito.countDocuments({
      usuarioId: req.usuario._id,
      activo: true,
    });

    res.json({
      success: true,
      data: favoritos,
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

// GET /api/favoritos/usuario/:usuarioId - Obtener favoritos de un usuario específico (Solo admin o propio usuario)
router.get(
  "/usuario/:usuarioId",
  verificarAuth,
  verificarPropietario,
  async (req, res, next) => {
    try {
      const { usuarioId } = req.params;
      const { pagina = 1, limite = 20 } = req.query;

      const skip = (parseInt(pagina) - 1) * parseInt(limite);

      const favoritos = await Favorito.obtenerFavoritosUsuario(usuarioId, {
        limite: parseInt(limite),
        desplazamiento: skip,
      });

      const total = await Favorito.countDocuments({
        usuarioId,
        activo: true,
      });

      res.json({
        success: true,
        data: favoritos,
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

// GET /api/favoritos/producto/:productoId - Obtener usuarios que tienen un producto en favoritos (Solo admin)
router.get("/producto/:productoId", verificarAuth, async (req, res, next) => {
  try {
    const { productoId } = req.params;
    const { pagina = 1, limite = 20 } = req.query;

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const usuarios = await Favorito.obtenerUsuariosFavorito(productoId, {
      limite: parseInt(limite),
      desplazamiento: skip,
    });

    const total = await Favorito.countDocuments({
      productoId,
      activo: true,
    });

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
});

// GET /api/favoritos/verificar/:productoId - Verificar si un producto está en favoritos
router.get(
  "/verificar/:productoId",
  autenticacionOpcional,
  async (req, res, next) => {
    try {
      // Si no hay usuario autenticado, retornar false para modo invitado
      if (!req.usuario || !req.usuario._id) {
        return res.json({
          success: true,
          data: {
            enFavoritos: false,
            favorito: null,
          },
          message: "Modo invitado - favoritos no disponibles",
        });
      }

      const { productoId } = req.params;

      const favorito = await Favorito.estaEnFavoritos(
        req.usuario._id,
        productoId
      );

      res.json({
        success: true,
        data: {
          enFavoritos: !!favorito,
          favorito: favorito || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/favoritos/estadisticas - Obtener estadísticas de favoritos
router.get("/estadisticas", verificarAuth, async (req, res, next) => {
  try {
    const estadisticas = await Favorito.obtenerEstadisticas(req.usuario._id);

    res.json({
      success: true,
      data: estadisticas,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/favoritos - Agregar producto a favoritos
router.post(
  "/",
  autenticacionOpcional,
  validarDatos(esquemaFavorito),
  async (req, res, next) => {
    try {
      console.log(
        "🔍 POST /api/favoritos - Usuario:",
        req.usuario ? req.usuario._id : "null"
      );

      // Si no hay usuario autenticado, retornar error para modo invitado
      if (!req.usuario || !req.usuario._id) {
        console.log("❌ No hay usuario autenticado");
        return res.status(401).json({
          success: false,
          error: "Autenticación requerida",
          message: "Debe iniciar sesión para agregar productos a favoritos",
        });
      }

      const { productoId, ...datosAdicionales } = req.body;

      // Verificar que el producto existe
      const producto = await Producto.findById(productoId);
      if (!producto || !producto.activo) {
        return res.status(404).json({
          success: false,
          error: "Producto no encontrado",
        });
      }

      const favorito = await Favorito.agregarFavorito(
        req.usuario._id,
        productoId,
        datosAdicionales
      );

      res.status(201).json({
        success: true,
        data: favorito,
        message: "Producto agregado a favoritos exitosamente",
      });
    } catch (error) {
      if (error.message === "El producto ya está en favoritos") {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

// DELETE /api/favoritos/:productoId - Remover producto de favoritos
router.delete("/:productoId", verificarAuth, async (req, res, next) => {
  try {
    const { productoId } = req.params;

    await Favorito.removerFavorito(req.usuario._id, productoId);

    res.json({
      success: true,
      message: "Producto removido de favoritos exitosamente",
    });
  } catch (error) {
    if (error.message === "Favorito no encontrado") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
});

// PUT /api/favoritos/:productoId - Actualizar favorito
router.put("/:productoId", verificarAuth, async (req, res, next) => {
  try {
    const { productoId } = req.params;
    const { notas, prioridad, notificarOferta, notificarStock } = req.body;

    const favorito = await Favorito.findOne({
      usuarioId: req.usuario._id,
      productoId,
      activo: true,
    });

    if (!favorito) {
      return res.status(404).json({
        success: false,
        error: "Favorito no encontrado",
      });
    }

    if (notas !== undefined) favorito.notas = notas;
    if (prioridad !== undefined) {
      await favorito.actualizarPrioridad(prioridad);
    }
    if (notificarOferta !== undefined || notificarStock !== undefined) {
      await favorito.actualizarNotificaciones({
        notificarOferta,
        notificarStock,
      });
    }

    await favorito.save();

    res.json({
      success: true,
      data: favorito,
      message: "Favorito actualizado exitosamente",
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/favoritos/:productoId/vista - Incrementar vista de favorito
router.put("/:productoId/vista", verificarAuth, async (req, res, next) => {
  try {
    const { productoId } = req.params;

    const favorito = await Favorito.findOne({
      usuarioId: req.usuario._id,
      productoId,
      activo: true,
    });

    if (!favorito) {
      return res.status(404).json({
        success: false,
        error: "Favorito no encontrado",
      });
    }

    await favorito.incrementarVista();

    res.json({
      success: true,
      message: "Vista registrada exitosamente",
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/favoritos/ofertas - Obtener productos en favoritos que están en oferta
router.get("/ofertas", verificarAuth, async (req, res, next) => {
  try {
    const favoritos = await Favorito.find({
      usuarioId: req.usuario._id,
      activo: true,
      notificarOferta: true,
    }).populate({
      path: "productoId",
      match: { "oferta.activa": true },
      populate: {
        path: "tipoProductoId",
        model: "TipoProducto",
      },
    });

    const productosEnOferta = favoritos
      .filter((fav) => fav.productoId)
      .map((fav) => ({
        favorito: fav,
        producto: fav.productoId,
      }));

    res.json({
      success: true,
      data: productosEnOferta,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/favoritos/stock-bajo - Obtener productos en favoritos con stock bajo
router.get("/stock-bajo", verificarAuth, async (req, res, next) => {
  try {
    const { limiteStock = 5 } = req.query;

    const favoritos = await Favorito.find({
      usuarioId: req.usuario._id,
      activo: true,
      notificarStock: true,
    }).populate({
      path: "productoId",
      match: {
        stock: { $lte: parseInt(limiteStock) },
        activo: true,
      },
      populate: {
        path: "tipoProductoId",
        model: "TipoProducto",
      },
    });

    const productosStockBajo = favoritos
      .filter((fav) => fav.productoId)
      .map((fav) => ({
        favorito: fav,
        producto: fav.productoId,
      }));

    res.json({
      success: true,
      data: productosStockBajo,
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint de prueba para verificar autenticación
router.get("/test-auth", autenticacionOpcional, async (req, res, next) => {
  try {
    console.log(
      "🔍 Test auth - Usuario:",
      req.usuario ? req.usuario._id : "null"
    );
    res.json({
      success: true,
      usuario: req.usuario ? req.usuario._id : null,
      message: req.usuario ? "Usuario autenticado" : "Usuario no autenticado",
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint de prueba POST para verificar autenticación
router.post("/test-auth", autenticacionOpcional, async (req, res, next) => {
  try {
    console.log(
      "🔍 POST Test auth - Usuario:",
      req.usuario ? req.usuario._id : "null"
    );
    res.json({
      success: true,
      usuario: req.usuario ? req.usuario._id : null,
      message: req.usuario ? "Usuario autenticado" : "Usuario no autenticado",
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint simple sin middleware para probar
router.get("/simple-test", async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: "Endpoint simple funcionando",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

