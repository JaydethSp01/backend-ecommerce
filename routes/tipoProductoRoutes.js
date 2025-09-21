const express = require("express");
const router = express.Router();
const TipoProducto = require("../models/TipoProducto");
const {
  verificarFirebaseAuth,
  verificarAdmin,
  autenticacionOpcional,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");

// Esquemas de validación
const esquemaTipoProducto = Joi.object({
  nombre: Joi.string().required().max(100),
  descripcion: Joi.string().max(500),
  activo: Joi.boolean().default(true),
  orden: Joi.number().default(0),
  metaDescripcion: Joi.string().max(160),
  palabrasClave: Joi.array().items(Joi.string()),
  traducciones: Joi.object({
    es: Joi.object({
      nombre: Joi.string(),
      descripcion: Joi.string(),
    }),
    en: Joi.object({
      nombre: Joi.string(),
      descripcion: Joi.string(),
    }),
    fr: Joi.object({
      nombre: Joi.string(),
      descripcion: Joi.string(),
    }),
    pt: Joi.object({
      nombre: Joi.string(),
      descripcion: Joi.string(),
    }),
  }),
});

// GET /api/tipo_producto - Obtener todos los tipos de producto
router.get("/", autenticacionOpcional, async (req, res, next) => {
  try {
    const { activo = true, ordenar = "orden" } = req.query;

    const filtros = {};
    if (activo === "true") {
      filtros.activo = true;
    }

    const ordenamiento = {};
    if (ordenar === "orden") {
      ordenamiento.orden = 1;
      ordenamiento.nombre = 1;
    } else {
      ordenamiento[ordenar] = 1;
    }

    const tiposProducto = await TipoProducto.find(filtros).sort(ordenamiento);

    res.json({
      success: true,
      data: tiposProducto,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tipo_producto/activos - Obtener tipos de producto activos
router.get("/activos", autenticacionOpcional, async (req, res, next) => {
  try {
    const tiposProducto = await TipoProducto.obtenerActivos();

    res.json({
      success: true,
      data: tiposProducto,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tipo_producto/:id - Obtener tipo de producto por ID
router.get("/:id", autenticacionOpcional, async (req, res, next) => {
  try {
    const tipoProducto = await TipoProducto.findById(req.params.id);

    if (!tipoProducto) {
      return res.status(404).json({
        success: false,
        error: "Tipo de producto no encontrado",
      });
    }

    res.json({
      success: true,
      data: tipoProducto,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tipo_producto/slug/:slug - Obtener tipo de producto por slug
router.get("/slug/:slug", autenticacionOpcional, async (req, res, next) => {
  try {
    const tipoProducto = await TipoProducto.findOne({
      slug: req.params.slug,
      activo: true,
    });

    if (!tipoProducto) {
      return res.status(404).json({
        success: false,
        error: "Tipo de producto no encontrado",
      });
    }

    res.json({
      success: true,
      data: tipoProducto,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tipo_producto/:id/productos - Obtener productos de un tipo específico
router.get("/:id/productos", autenticacionOpcional, async (req, res, next) => {
  try {
    const { pagina = 1, limite = 20 } = req.query;
    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const Producto = require("../models/Producto");

    const productos = await Producto.find({
      tipoProductoId: req.params.id,
      activo: true,
    })
      .populate("tipoProductoId", "nombre descripcion")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limite));

    const total = await Producto.countDocuments({
      tipoProductoId: req.params.id,
      activo: true,
    });

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
});

// GET /api/tipo_producto/:id/estadisticas - Obtener estadísticas de un tipo de producto
router.get(
  "/:id/estadisticas",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const tipoProducto = await TipoProducto.findById(req.params.id);

      if (!tipoProducto) {
        return res.status(404).json({
          success: false,
          error: "Tipo de producto no encontrado",
        });
      }

      const Producto = require("../models/Producto");

      const estadisticas = await Producto.aggregate([
        { $match: { tipoProductoId: tipoProducto._id, activo: true } },
        {
          $group: {
            _id: null,
            totalProductos: { $sum: 1 },
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
      ]);

      const resultado = estadisticas[0] || {
        totalProductos: 0,
        precioPromedio: 0,
        precioMinimo: 0,
        precioMaximo: 0,
        totalStock: 0,
        productosDestacados: 0,
        productosEnOferta: 0,
      };

      res.json({
        success: true,
        data: {
          tipoProducto: {
            id: tipoProducto._id,
            nombre: tipoProducto.nombre,
            descripcion: tipoProducto.descripcion,
          },
          estadisticas: resultado,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tipo_producto - Crear nuevo tipo de producto (Solo admin)
router.post(
  "/",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaTipoProducto),
  async (req, res, next) => {
    try {
      const tipoProducto = new TipoProducto(req.body);
      await tipoProducto.save();

      res.status(201).json({
        success: true,
        data: tipoProducto,
        message: "Tipo de producto creado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/tipo_producto/:id - Actualizar tipo de producto (Solo admin)
router.put(
  "/:id",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaTipoProducto),
  async (req, res, next) => {
    try {
      const tipoProducto = await TipoProducto.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!tipoProducto) {
        return res.status(404).json({
          success: false,
          error: "Tipo de producto no encontrado",
        });
      }

      res.json({
        success: true,
        data: tipoProducto,
        message: "Tipo de producto actualizado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/tipo_producto/:id - Eliminar tipo de producto (Solo admin)
router.delete(
  "/:id",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const tipoProducto = await TipoProducto.findById(req.params.id);

      if (!tipoProducto) {
        return res.status(404).json({
          success: false,
          error: "Tipo de producto no encontrado",
        });
      }

      // Verificar si hay productos asociados
      const Producto = require("../models/Producto");
      const productosAsociados = await Producto.countDocuments({
        tipoProductoId: req.params.id,
        activo: true,
      });

      if (productosAsociados > 0) {
        return res.status(400).json({
          success: false,
          error: `No se puede eliminar el tipo de producto porque tiene ${productosAsociados} productos asociados`,
        });
      }

      await TipoProducto.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Tipo de producto eliminado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/tipo_producto/:id/activar - Activar/desactivar tipo de producto (Solo admin)
router.put(
  "/:id/activar",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { activo } = req.body;
      const tipoProducto = await TipoProducto.findByIdAndUpdate(
        req.params.id,
        { activo },
        { new: true }
      );

      if (!tipoProducto) {
        return res.status(404).json({
          success: false,
          error: "Tipo de producto no encontrado",
        });
      }

      res.json({
        success: true,
        data: tipoProducto,
        message: `Tipo de producto ${
          activo ? "activado" : "desactivado"
        } exitosamente`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/tipo_producto/:id/orden - Actualizar orden (Solo admin)
router.put(
  "/:id/orden",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { orden } = req.body;

      if (typeof orden !== "number") {
        return res.status(400).json({
          success: false,
          error: "El orden debe ser un número",
        });
      }

      const tipoProducto = await TipoProducto.findByIdAndUpdate(
        req.params.id,
        { orden },
        { new: true }
      );

      if (!tipoProducto) {
        return res.status(404).json({
          success: false,
          error: "Tipo de producto no encontrado",
        });
      }

      res.json({
        success: true,
        data: tipoProducto,
        message: "Orden actualizado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/tipo_producto/:id/actualizar-contador - Actualizar contador de productos (Solo admin)
router.put(
  "/:id/actualizar-contador",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const tipoProducto = await TipoProducto.findById(req.params.id);

      if (!tipoProducto) {
        return res.status(404).json({
          success: false,
          error: "Tipo de producto no encontrado",
        });
      }

      await tipoProducto.actualizarContadorProductos();

      res.json({
        success: true,
        data: tipoProducto,
        message: "Contador de productos actualizado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

