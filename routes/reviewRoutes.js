const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Producto = require("../models/Producto");
const Usuario = require("../models/Usuario");
const {
  verificarFirebaseAuth,
  verificarAuth,
  verificarAdmin,
  verificarPropietario,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");

// Esquemas de validación
const esquemaCrearReview = Joi.object({
  productoId: Joi.alternatives()
    .try(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // MongoDB ObjectId
      Joi.string().min(1) // String ID
    )
    .required(),
  usuarioId: Joi.alternatives()
    .try(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // MongoDB ObjectId
      Joi.string().min(1) // String ID (Firebase UID)
    )
    .required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  titulo: Joi.string().max(100).required(),
  comentario: Joi.string().max(1000).required(),
  pros: Joi.array().items(Joi.string().max(200)).max(5),
  contras: Joi.array().items(Joi.string().max(200)).max(5),
  recomendado: Joi.boolean().default(true),
  verificacionCompra: Joi.boolean().default(false),
});

const esquemaActualizarReview = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  titulo: Joi.string().max(100),
  comentario: Joi.string().max(1000),
  pros: Joi.array().items(Joi.string().max(200)).max(5),
  contras: Joi.array().items(Joi.string().max(200)).max(5),
  recomendado: Joi.boolean(),
  verificacionCompra: Joi.boolean(),
});

// GET /api/reviews - Obtener todas las reviews con filtros
router.get("/", async (req, res, next) => {
  try {
    const {
      pagina = 1,
      limite = 20,
      productoId,
      usuarioId,
      rating,
      ordenar = "fechaCreacion",
      direccion = "desc",
    } = req.query;

    // Construir filtros
    const filtros = {};
    if (productoId) filtros.productoId = productoId;
    if (usuarioId) filtros.usuarioId = usuarioId;
    if (rating) filtros.rating = parseInt(rating);

    // Configurar ordenamiento
    const ordenamiento = {};
    ordenamiento[ordenar] = direccion === "asc" ? 1 : -1;

    // Calcular paginación
    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    // Ejecutar consulta con populate
    const reviews = await Review.find(filtros)
      .populate("productoId", "nombre marca precio imagen")
      .populate("usuarioId", "nombre email avatar")
      .sort(ordenamiento)
      .skip(skip)
      .limit(parseInt(limite));

    const total = await Review.countDocuments(filtros);

    res.json({
      success: true,
      data: reviews,
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

// GET /api/reviews/producto/:productoId - Obtener reviews de un producto
router.get("/producto/:productoId", async (req, res, next) => {
  try {
    const { productoId } = req.params;
    const { pagina = 1, limite = 10, rating } = req.query;

    // Verificar que el producto existe
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
      });
    }

    // Construir filtros
    const filtros = { productoId };
    if (rating) filtros.rating = parseInt(rating);

    // Calcular paginación
    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    // Obtener reviews
    const reviews = await Review.find(filtros)
      .populate("usuarioId", "nombre email avatar")
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(parseInt(limite));

    const total = await Review.countDocuments(filtros);

    // Calcular estadísticas
    const estadisticas = await Review.aggregate([
      { $match: { productoId: productoId } },
      {
        $group: {
          _id: null,
          promedioRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          distribucionRating: {
            $push: "$rating",
          },
        },
      },
    ]);

    const distribucion = [0, 0, 0, 0, 0]; // Para ratings 1-5
    if (estadisticas.length > 0) {
      estadisticas[0].distribucionRating.forEach((rating) => {
        if (rating >= 1 && rating <= 5) {
          distribucion[rating - 1]++;
        }
      });
    }

    res.json({
      success: true,
      data: reviews,
      estadisticas: {
        promedioRating: estadisticas[0]?.promedioRating || 0,
        totalReviews: estadisticas[0]?.totalReviews || 0,
        distribucionRating: distribucion,
      },
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

// GET /api/reviews/usuario/:usuarioId - Obtener reviews de un usuario
router.get("/usuario/:usuarioId", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { usuarioId } = req.params;
    const { pagina = 1, limite = 10 } = req.query;

    // Verificar permisos
    if (
      req.usuario.rol !== "ADMIN" &&
      req.usuario._id.toString() !== usuarioId
    ) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para ver estas reviews",
      });
    }

    // Calcular paginación
    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    // Obtener reviews del usuario
    const reviews = await Review.find({ usuarioId })
      .populate("productoId", "nombre marca precio imagen")
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(parseInt(limite));

    const total = await Review.countDocuments({ usuarioId });

    res.json({
      success: true,
      data: reviews,
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

// GET /api/reviews/:id - Obtener review por ID
router.get("/:id", async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("productoId", "nombre marca precio imagen")
      .populate("usuarioId", "nombre email avatar");

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review no encontrada",
      });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews/test - Endpoint de prueba
router.post("/test", (req, res) => {
  console.log("🔍 POST /api/reviews/test - Endpoint de prueba");
  res.json({ success: true, message: "Endpoint de prueba funcionando" });
});

// POST /api/reviews - Crear nueva review
router.post(
  "/",
  // verificarAuth, // Temporalmente comentado para testing
  // validarDatos(esquemaCrearReview), // Temporalmente comentado para debugging
  async (req, res, next) => {
    try {
      console.log("🔍 POST /api/reviews - Iniciando endpoint");
      console.log("🔍 POST /api/reviews - Request body:", req.body);
      const {
        productoId,
        usuarioId,
        rating,
        titulo,
        comentario,
        pros,
        contras,
        recomendado,
        verificacionCompra,
      } = req.body;

      // Verificar que el producto existe
      console.log("🔍 Buscando producto con ID:", productoId);
      const producto = await Producto.findById(productoId);
      console.log("🔍 Producto encontrado:", producto ? "Sí" : "No");
      if (!producto) {
        return res.status(404).json({
          success: false,
          error: "Producto no encontrado",
        });
      }

      // Verificar que el usuario existe
      const usuario = await Usuario.findById(usuarioId);
      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      // Verificar que el usuario no haya ya reseñado este producto
      const reviewExistente = await Review.findOne({
        productoId,
        usuarioId,
      });

      if (reviewExistente) {
        return res.status(400).json({
          success: false,
          error: "Ya has reseñado este producto",
        });
      }

      // Crear nueva review
      const nuevaReview = new Review({
        productoId,
        usuarioId,
        nombreUsuario: usuario.nombre || usuario.nombreCompleto || "Usuario",
        emailUsuario: usuario.email,
        calificacion: rating,
        titulo,
        comentario,
        pros: pros || [],
        contras: contras || [],
        recomendado: recomendado !== undefined ? recomendado : true,
        verificacionCompra: verificacionCompra || false,
        fecha: new Date(),
      });

      await nuevaReview.save();

      // Poblar la review creada
      await nuevaReview.populate([
        { path: "productoId", select: "nombre marca precio imagen" },
        { path: "usuarioId", select: "nombre email avatar" },
      ]);

      res.status(201).json({
        success: true,
        data: nuevaReview,
        message: "Review creada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/reviews/:id - Actualizar review
router.put(
  "/:id",
  verificarFirebaseAuth,
  verificarPropietario,
  validarDatos(esquemaActualizarReview),
  async (req, res, next) => {
    try {
      const review = await Review.findByIdAndUpdate(
        req.params.id,
        { ...req.body, fechaActualizacion: new Date() },
        { new: true, runValidators: true }
      )
        .populate("productoId", "nombre marca precio imagen")
        .populate("usuarioId", "nombre email avatar");

      if (!review) {
        return res.status(404).json({
          success: false,
          error: "Review no encontrada",
        });
      }

      res.json({
        success: true,
        data: review,
        message: "Review actualizada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/reviews/:id - Eliminar review
router.delete(
  "/:id",
  verificarFirebaseAuth,
  verificarPropietario,
  async (req, res, next) => {
    try {
      const review = await Review.findByIdAndDelete(req.params.id);

      if (!review) {
        return res.status(404).json({
          success: false,
          error: "Review no encontrada",
        });
      }

      res.json({
        success: true,
        message: "Review eliminada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reviews/estadisticas/producto/:productoId - Obtener estadísticas de reviews de un producto
router.get("/estadisticas/producto/:productoId", async (req, res, next) => {
  try {
    const { productoId } = req.params;

    // Verificar que el producto existe
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
      });
    }

    // Calcular estadísticas
    const estadisticas = await Review.aggregate([
      { $match: { productoId: productoId } },
      {
        $group: {
          _id: null,
          promedioRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          distribucionRating: {
            $push: "$rating",
          },
          reviewsRecomendadas: {
            $sum: { $cond: ["$recomendado", 1, 0] },
          },
          reviewsVerificadas: {
            $sum: { $cond: ["$verificacionCompra", 1, 0] },
          },
        },
      },
    ]);

    const distribucion = [0, 0, 0, 0, 0]; // Para ratings 1-5
    if (estadisticas.length > 0) {
      estadisticas[0].distribucionRating.forEach((rating) => {
        if (rating >= 1 && rating <= 5) {
          distribucion[rating - 1]++;
        }
      });
    }

    const resultado = estadisticas[0] || {
      promedioRating: 0,
      totalReviews: 0,
      reviewsRecomendadas: 0,
      reviewsVerificadas: 0,
    };

    resultado.distribucionRating = distribucion;

    res.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;