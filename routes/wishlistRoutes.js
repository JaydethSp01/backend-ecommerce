const express = require("express");
const router = express.Router();
const Wishlist = require("../models/Wishlist");
const Producto = require("../models/Producto");
const {
  verificarFirebaseAuth,
  verificarPropietario,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");

// Esquemas de validación
const esquemaWishlist = Joi.object({
  nombre: Joi.string().required().max(100),
  descripcion: Joi.string().max(500),
  publica: Joi.boolean().default(false),
  notificaciones: Joi.object({
    ofertas: Joi.boolean().default(true),
    stock: Joi.boolean().default(true),
    nuevosProductos: Joi.boolean().default(false),
  }),
});

const esquemaProductoWishlist = Joi.object({
  productoId: Joi.string().required(),
  notas: Joi.string().max(200),
  prioridad: Joi.number().min(1).max(5).default(3),
  cantidad: Joi.number().min(1).default(1),
});

// GET /api/wishlists - Obtener wishlists del usuario autenticado
router.get("/", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { pagina = 1, limite = 20 } = req.query;

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const wishlists = await Wishlist.obtenerWishlistsUsuario(req.usuario._id, {
      limite: parseInt(limite),
      desplazamiento: skip,
    });

    const total = await Wishlist.countDocuments({
      usuarioId: req.usuario._id,
      activa: true,
    });

    res.json({
      success: true,
      data: wishlists,
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

// GET /api/wishlists/publica/:codigo - Obtener wishlist pública por código
router.get("/publica/:codigo", async (req, res, next) => {
  try {
    const { codigo } = req.params;

    const wishlist = await Wishlist.obtenerWishlistPublica(codigo);

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: "Wishlist no encontrada o no es pública",
      });
    }

    // Incrementar vistas
    await wishlist.incrementarVistas();

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/wishlists/usuario/:usuarioId - Obtener wishlists de un usuario específico (Solo admin o propio usuario)
router.get(
  "/usuario/:usuarioId",
  verificarFirebaseAuth,
  verificarPropietario,
  async (req, res, next) => {
    try {
      const { usuarioId } = req.params;
      const { pagina = 1, limite = 20 } = req.query;

      const skip = (parseInt(pagina) - 1) * parseInt(limite);

      const wishlists = await Wishlist.obtenerWishlistsUsuario(usuarioId, {
        limite: parseInt(limite),
        desplazamiento: skip,
      });

      const total = await Wishlist.countDocuments({
        usuarioId,
        activa: true,
      });

      res.json({
        success: true,
        data: wishlists,
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

// GET /api/wishlists/:id - Obtener wishlist por ID
router.get("/:id", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const wishlist = await Wishlist.findOne({
      _id: id,
      $or: [{ usuarioId: req.usuario._id }, { publica: true }],
      activa: true,
    }).populate({
      path: "productos.productoId",
      populate: {
        path: "tipoProductoId",
        model: "TipoProducto",
      },
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: "Wishlist no encontrada",
      });
    }

    // Incrementar vistas si no es el propietario
    if (wishlist.usuarioId.toString() !== req.usuario._id.toString()) {
      await wishlist.incrementarVistas();
    }

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/wishlists - Crear nueva wishlist
router.post(
  "/",
  verificarFirebaseAuth,
  validarDatos(esquemaWishlist),
  async (req, res, next) => {
    try {
      const wishlist = await Wishlist.crearWishlist(req.usuario._id, req.body);

      res.status(201).json({
        success: true,
        data: wishlist,
        message: "Wishlist creada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/wishlists/:id - Actualizar wishlist
router.put(
  "/:id",
  verificarFirebaseAuth,
  validarDatos(esquemaWishlist),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const wishlist = await Wishlist.findOneAndUpdate(
        { _id: id, usuarioId: req.usuario._id, activa: true },
        req.body,
        { new: true, runValidators: true }
      );

      if (!wishlist) {
        return res.status(404).json({
          success: false,
          error: "Wishlist no encontrada",
        });
      }

      res.json({
        success: true,
        data: wishlist,
        message: "Wishlist actualizada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/wishlists/:id - Eliminar wishlist
router.delete("/:id", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const wishlist = await Wishlist.findOneAndUpdate(
      { _id: id, usuarioId: req.usuario._id, activa: true },
      { activa: false },
      { new: true }
    );

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: "Wishlist no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Wishlist eliminada exitosamente",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/wishlists/:id/productos - Agregar producto a wishlist
router.post(
  "/:id/productos",
  verificarFirebaseAuth,
  validarDatos(esquemaProductoWishlist),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { productoId, ...datosAdicionales } = req.body;

      // Verificar que el producto existe
      const producto = await Producto.findById(productoId);
      if (!producto || !producto.activo) {
        return res.status(404).json({
          success: false,
          error: "Producto no encontrado",
        });
      }

      const wishlist = await Wishlist.findOne({
        _id: id,
        usuarioId: req.usuario._id,
        activa: true,
      });

      if (!wishlist) {
        return res.status(404).json({
          success: false,
          error: "Wishlist no encontrada",
        });
      }

      await wishlist.agregarProducto(productoId, datosAdicionales);

      res.status(201).json({
        success: true,
        message: "Producto agregado a la wishlist exitosamente",
      });
    } catch (error) {
      if (error.message === "El producto ya está en esta wishlist") {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

// DELETE /api/wishlists/:id/productos/:productoId - Remover producto de wishlist
router.delete(
  "/:id/productos/:productoId",
  verificarFirebaseAuth,
  async (req, res, next) => {
    try {
      const { id, productoId } = req.params;

      const wishlist = await Wishlist.findOne({
        _id: id,
        usuarioId: req.usuario._id,
        activa: true,
      });

      if (!wishlist) {
        return res.status(404).json({
          success: false,
          error: "Wishlist no encontrada",
        });
      }

      await wishlist.removerProducto(productoId);

      res.json({
        success: true,
        message: "Producto removido de la wishlist exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/wishlists/:id/productos/:productoId - Actualizar producto en wishlist
router.put(
  "/:id/productos/:productoId",
  verificarFirebaseAuth,
  async (req, res, next) => {
    try {
      const { id, productoId } = req.params;
      const { notas, prioridad, cantidad } = req.body;

      const wishlist = await Wishlist.findOne({
        _id: id,
        usuarioId: req.usuario._id,
        activa: true,
      });

      if (!wishlist) {
        return res.status(404).json({
          success: false,
          error: "Wishlist no encontrada",
        });
      }

      const datosActualizados = {};
      if (notas !== undefined) datosActualizados.notas = notas;
      if (prioridad !== undefined) datosActualizados.prioridad = prioridad;
      if (cantidad !== undefined) datosActualizados.cantidad = cantidad;

      await wishlist.actualizarProducto(productoId, datosActualizados);

      res.json({
        success: true,
        message: "Producto actualizado en la wishlist exitosamente",
      });
    } catch (error) {
      if (error.message === "Producto no encontrado en la wishlist") {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

// PUT /api/wishlists/:id/compartir - Configurar compartir wishlist
router.put("/:id/compartir", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { publica, maxUsos, fechaExpiracion } = req.body;

    const wishlist = await Wishlist.findOne({
      _id: id,
      usuarioId: req.usuario._id,
      activa: true,
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: "Wishlist no encontrada",
      });
    }

    wishlist.publica = publica;
    if (publica) {
      if (maxUsos !== undefined) wishlist.compartir.maxUsos = maxUsos;
      if (fechaExpiracion !== undefined)
        wishlist.compartir.fechaExpiracion = fechaExpiracion;

      if (!wishlist.compartir.codigo) {
        await wishlist.generarNuevoCodigo();
      }
    }

    await wishlist.save();

    res.json({
      success: true,
      data: {
        publica: wishlist.publica,
        codigo: wishlist.compartir.codigo,
        url: wishlist.publica
          ? `${process.env.FRONTEND_URL}/wishlist/${wishlist.compartir.codigo}`
          : null,
      },
      message: `Wishlist ${
        publica ? "compartida" : "dejada de compartir"
      } exitosamente`,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/wishlists/:id/codigo - Generar nuevo código de compartir
router.put("/:id/codigo", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const wishlist = await Wishlist.findOne({
      _id: id,
      usuarioId: req.usuario._id,
      activa: true,
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: "Wishlist no encontrada",
      });
    }

    await wishlist.generarNuevoCodigo();

    res.json({
      success: true,
      data: {
        codigo: wishlist.compartir.codigo,
        url: `${process.env.FRONTEND_URL}/wishlist/${wishlist.compartir.codigo}`,
      },
      message: "Nuevo código generado exitosamente",
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/wishlists/:id/valor-total - Calcular valor total de la wishlist
router.get(
  "/:id/valor-total",
  verificarFirebaseAuth,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const wishlist = await Wishlist.findOne({
        _id: id,
        $or: [{ usuarioId: req.usuario._id }, { publica: true }],
        activa: true,
      });

      if (!wishlist) {
        return res.status(404).json({
          success: false,
          error: "Wishlist no encontrada",
        });
      }

      const valorTotal = await wishlist.calcularValorTotal();

      res.json({
        success: true,
        data: {
          valorTotal,
          totalProductos: wishlist.totalProductos,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/wishlists/:id/ofertas - Obtener productos en oferta de la wishlist
router.get("/:id/ofertas", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const wishlist = await Wishlist.findOne({
      _id: id,
      $or: [{ usuarioId: req.usuario._id }, { publica: true }],
      activa: true,
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: "Wishlist no encontrada",
      });
    }

    const productosEnOferta = await wishlist.obtenerProductosEnOferta();

    res.json({
      success: true,
      data: productosEnOferta,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

