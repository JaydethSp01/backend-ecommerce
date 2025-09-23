const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Producto = require("../models/Producto");
const {
  verificarFirebaseAuth,
  verificarAdmin,
  autenticacionOpcional,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");

// Esquemas de validación
const esquemaReview = Joi.object({
  productoId: Joi.string().required(),
  nombreUsuario: Joi.string().required().max(100),
  emailUsuario: Joi.string().email().required(),
  calificacion: Joi.number().integer().min(1).max(5).required(),
  titulo: Joi.string().max(200).optional(),
  comentario: Joi.string().required().max(1000),
});

const esquemaActualizacionReview = Joi.object({
  calificacion: Joi.number().integer().min(1).max(5).optional(),
  titulo: Joi.string().max(200).optional(),
  comentario: Joi.string().max(1000).optional(),
});

const esquemaRespuestaAdmin = Joi.object({
  texto: Joi.string().required().max(500),
});

// GET /api/reviews/producto/:productoId - Obtener reviews de un producto
router.get("/producto/:productoId", autenticacionOpcional, async (req, res, next) => {
  try {
    const { productoId } = req.params;
    const {
      pagina = 1,
      limite = 10,
      ordenar = "fecha",
      direccion = "desc",
      calificacion,
      verificadas,
    } = req.query;

    // Verificar que el producto existe
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    const resultado = await Review.obtenerReviewsProducto(productoId, {
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      ordenar,
      direccion,
      calificacion,
      verificadas,
    });

    res.json({
      success: true,
      data: resultado.reviews,
      paginacion: resultado.paginacion,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reviews/producto/:productoId/estadisticas - Obtener estadísticas de reviews de un producto
router.get("/producto/:productoId/estadisticas", async (req, res, next) => {
  try {
    const { productoId } = req.params;

    // Verificar que el producto existe
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    const estadisticas = await Review.obtenerEstadisticasProducto(productoId);

    res.json({
      success: true,
      data: estadisticas,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reviews/usuario/:usuarioId - Obtener reviews de un usuario (solo admin o propio usuario)
router.get("/usuario/:usuarioId", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { usuarioId } = req.params;
    const { pagina = 1, limite = 10 } = req.query;

    // Verificar permisos
    if (req.usuario.rol !== "ADMIN" && req.usuario._id.toString() !== usuarioId) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para ver estas reseñas",
      });
    }

    const resultado = await Review.obtenerReviewsUsuario(usuarioId, {
      pagina: parseInt(pagina),
      limite: parseInt(limite),
    });

    res.json({
      success: true,
      data: resultado.reviews,
      paginacion: resultado.paginacion,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews - Crear una nueva review
router.post("/", verificarFirebaseAuth, validarDatos(esquemaReview), async (req, res, next) => {
  try {
    const {
      productoId,
      nombreUsuario,
      emailUsuario,
      calificacion,
      titulo,
      comentario,
    } = req.body;

    // Verificar que el producto existe
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // Verificar que el usuario no haya hecho ya una review para este producto
    const reviewExistente = await Review.findOne({
      productoId,
      usuarioId: req.usuario._id,
      activa: true,
    });

    if (reviewExistente) {
      return res.status(400).json({
        success: false,
        message: "Ya has escrito una reseña para este producto",
      });
    }

    // Crear la review
    const review = new Review({
      productoId,
      usuarioId: req.usuario._id,
      nombreUsuario,
      emailUsuario,
      calificacion,
      titulo,
      comentario,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    await review.save();

    // Obtener estadísticas actualizadas
    const estadisticas = await Review.obtenerEstadisticasProducto(productoId);

    res.status(201).json({
      success: true,
      message: "Reseña creada exitosamente",
      data: review,
      estadisticas,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/reviews/:reviewId - Actualizar una review (solo el autor o admin)
router.put("/:reviewId", verificarFirebaseAuth, validarDatos(esquemaActualizacionReview), async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const actualizaciones = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Reseña no encontrada",
      });
    }

    // Verificar permisos
    if (req.usuario.rol !== "ADMIN" && review.usuarioId.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para editar esta reseña",
      });
    }

    // Actualizar la review
    Object.assign(review, actualizaciones);
    await review.save();

    // Obtener estadísticas actualizadas
    const estadisticas = await Review.obtenerEstadisticasProducto(review.productoId);

    res.json({
      success: true,
      message: "Reseña actualizada exitosamente",
      data: review,
      estadisticas,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/reviews/:reviewId - Eliminar una review (solo el autor o admin)
router.delete("/:reviewId", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Reseña no encontrada",
      });
    }

    // Verificar permisos
    if (req.usuario.rol !== "ADMIN" && review.usuarioId.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para eliminar esta reseña",
      });
    }

    // Marcar como inactiva en lugar de eliminar
    review.activa = false;
    await review.save();

    // Obtener estadísticas actualizadas
    const estadisticas = await Review.obtenerEstadisticasProducto(review.productoId);

    res.json({
      success: true,
      message: "Reseña eliminada exitosamente",
      estadisticas,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews/:reviewId/util - Marcar review como útil o no útil
router.post("/:reviewId/util", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { esUtil } = req.body;

    if (typeof esUtil !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "El campo 'esUtil' debe ser un booleano",
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Reseña no encontrada",
      });
    }

    await review.marcarUtil(esUtil);

    res.json({
      success: true,
      message: esUtil ? "Marcada como útil" : "Marcada como no útil",
      data: {
        util: review.util,
        noUtil: review.noUtil,
        porcentajeUtilidad: review.porcentajeUtilidad,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews/:reviewId/verificar - Verificar una review (solo admin)
router.post("/:reviewId/verificar", verificarAdmin, async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Reseña no encontrada",
      });
    }

    await review.verificarCompra();

    res.json({
      success: true,
      message: "Reseña verificada exitosamente",
      data: review,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews/:reviewId/reportar - Reportar una review
router.post("/:reviewId/reportar", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { motivo } = req.body;

    if (!motivo || motivo.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar un motivo para el reporte",
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Reseña no encontrada",
      });
    }

    await review.reportar(motivo);

    res.json({
      success: true,
      message: "Reseña reportada exitosamente",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews/:reviewId/respuesta - Responder a una review (solo admin)
router.post("/:reviewId/respuesta", verificarAdmin, validarDatos(esquemaRespuestaAdmin), async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { texto } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Reseña no encontrada",
      });
    }

    await review.responderAdmin(texto, req.usuario._id);

    res.json({
      success: true,
      message: "Respuesta agregada exitosamente",
      data: review,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reviews/reportadas - Obtener reviews reportadas (solo admin)
router.get("/reportadas", verificarAdmin, async (req, res, next) => {
  try {
    const { pagina = 1, limite = 20 } = req.query;
    const skip = (pagina - 1) * limite;

    const reviews = await Review.find({
      reportada: true,
      activa: true,
    })
      .populate("producto", "nombre marca")
      .populate("usuario", "nombre email")
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(limite)
      .lean();

    const total = await Review.countDocuments({
      reportada: true,
      activa: true,
    });

    res.json({
      success: true,
      data: reviews,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reviews/estadisticas-generales - Obtener estadísticas generales (solo admin)
router.get("/estadisticas-generales", verificarAdmin, async (req, res, next) => {
  try {
    const estadisticas = await Review.aggregate([
      {
        $match: { activa: true },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          promedioCalificacion: { $avg: "$calificacion" },
          reviewsVerificadas: {
            $sum: { $cond: ["$verificada", 1, 0] },
          },
          reviewsReportadas: {
            $sum: { $cond: ["$reportada", 1, 0] },
          },
          totalUtil: { $sum: "$util" },
          totalNoUtil: { $sum: "$noUtil" },
        },
      },
      {
        $project: {
          _id: 0,
          totalReviews: 1,
          promedioCalificacion: { $round: ["$promedioCalificacion", 1] },
          reviewsVerificadas: 1,
          reviewsReportadas: 1,
          totalUtil: 1,
          totalNoUtil: 1,
          porcentajeUtilidad: {
            $cond: [
              { $gt: [{ $add: ["$totalUtil", "$totalNoUtil"] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$totalUtil", { $add: ["$totalUtil", "$totalNoUtil"] }] },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
    ]);

    const resultado = estadisticas.length > 0 ? estadisticas[0] : {
      totalReviews: 0,
      promedioCalificacion: 0,
      reviewsVerificadas: 0,
      reviewsReportadas: 0,
      totalUtil: 0,
      totalNoUtil: 0,
      porcentajeUtilidad: 0,
    };

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

