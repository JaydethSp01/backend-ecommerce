const express = require("express");
const router = express.Router();
const Notificacion = require("../models/Notificacion");
const {
  verificarFirebaseAuth,
  verificarAdmin,
  verificarPropietario,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");

// Esquemas de validación
const esquemaNotificacion = Joi.object({
  titulo: Joi.string().required().max(200),
  mensaje: Joi.string().required().max(1000),
  tipo: Joi.string()
    .valid(
      "INFO",
      "SUCCESS",
      "WARNING",
      "ERROR",
      "PROMOCION",
      "STOCK",
      "OFERTA",
      "SISTEMA"
    )
    .default("INFO"),
  urlAccion: Joi.string().max(500),
  textoAccion: Joi.string().max(50),
  prioridad: Joi.number().min(1).max(5).default(3),
  expiracion: Joi.date(),
  categoria: Joi.string()
    .valid("PEDIDO", "PRODUCTO", "CUENTA", "PROMOCION", "SISTEMA", "OTRO")
    .default("OTRO"),
  grupoId: Joi.string(),
});

// GET /api/notificaciones - Obtener notificaciones del usuario autenticado
router.get("/", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const {
      pagina = 1,
      limite = 20,
      soloNoLeidas = false,
      tipo,
      categoria,
    } = req.query;

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const notificaciones = await Notificacion.obtenerNotificacionesUsuario(
      req.usuario._id,
      {
        soloNoLeidas: soloNoLeidas === "true",
        tipo,
        categoria,
        limite: parseInt(limite),
        desplazamiento: skip,
      }
    );

    const total = await Notificacion.countDocuments({
      usuarioId: req.usuario._id,
      $or: [{ expiracion: null }, { expiracion: { $gt: new Date() } }],
      ...(soloNoLeidas === "true" && { leida: false }),
      ...(tipo && { tipo }),
      ...(categoria && { categoria }),
    });

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
});

// GET /api/notificaciones/no-leidas - Obtener notificaciones no leídas
router.get("/no-leidas", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const notificaciones = await Notificacion.obtenerNoLeidas(req.usuario._id);

    res.json({
      success: true,
      data: notificaciones,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notificaciones/estadisticas - Obtener estadísticas de notificaciones
router.get("/estadisticas", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const estadisticas = await Notificacion.obtenerEstadisticas(
      req.usuario._id
    );

    res.json({
      success: true,
      data: estadisticas,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notificaciones/usuario/:usuarioId - Obtener notificaciones de un usuario específico (Solo admin)
router.get(
  "/usuario/:usuarioId",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { usuarioId } = req.params;
      const {
        pagina = 1,
        limite = 20,
        soloNoLeidas = false,
        tipo,
        categoria,
      } = req.query;

      const skip = (parseInt(pagina) - 1) * parseInt(limite);

      const notificaciones = await Notificacion.obtenerNotificacionesUsuario(
        usuarioId,
        {
          soloNoLeidas: soloNoLeidas === "true",
          tipo,
          categoria,
          limite: parseInt(limite),
          desplazamiento: skip,
        }
      );

      const total = await Notificacion.countDocuments({
        usuarioId,
        $or: [{ expiracion: null }, { expiracion: { $gt: new Date() } }],
        ...(soloNoLeidas === "true" && { leida: false }),
        ...(tipo && { tipo }),
        ...(categoria && { categoria }),
      });

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

// GET /api/notificaciones/:id - Obtener notificación por ID
router.get("/:id", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notificacion = await Notificacion.findOne({
      _id: id,
      usuarioId: req.usuario._id,
    });

    if (!notificacion) {
      return res.status(404).json({
        success: false,
        error: "Notificación no encontrada",
      });
    }

    res.json({
      success: true,
      data: notificacion,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/notificaciones - Crear nueva notificación
router.post(
  "/",
  verificarFirebaseAuth,
  validarDatos(esquemaNotificacion),
  async (req, res, next) => {
    try {
      const notificacion = await Notificacion.crearNotificacion({
        usuarioId: req.usuario._id,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        data: notificacion,
        message: "Notificación creada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/notificaciones/masiva - Crear notificación masiva (Solo admin)
router.post(
  "/masiva",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { usuariosIds, ...datosNotificacion } = req.body;

      if (
        !usuariosIds ||
        !Array.isArray(usuariosIds) ||
        usuariosIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Se requiere una lista de IDs de usuarios",
        });
      }

      const notificaciones = await Notificacion.crearNotificacionMasiva(
        usuariosIds,
        datosNotificacion
      );

      res.status(201).json({
        success: true,
        data: {
          creadas: notificaciones.length,
          notificaciones,
        },
        message: `${notificaciones.length} notificaciones creadas exitosamente`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/notificaciones/:id - Actualizar notificación
router.put(
  "/:id",
  verificarFirebaseAuth,
  validarDatos(esquemaNotificacion),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const notificacion = await Notificacion.findOneAndUpdate(
        { _id: id, usuarioId: req.usuario._id },
        req.body,
        { new: true, runValidators: true }
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
        message: "Notificación actualizada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/notificaciones/:id/leer - Marcar notificación como leída
router.put("/:id/leer", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notificacion = await Notificacion.marcarComoLeida(
      id,
      req.usuario._id
    );

    res.json({
      success: true,
      data: notificacion,
      message: "Notificación marcada como leída",
    });
  } catch (error) {
    if (error.message === "Notificación no encontrada") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
});

// PUT /api/notificaciones/leer-todas - Marcar todas las notificaciones como leídas
router.put("/leer-todas", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const resultado = await Notificacion.marcarTodasComoLeidas(req.usuario._id);

    res.json({
      success: true,
      data: {
        actualizadas: resultado.modifiedCount,
      },
      message: "Todas las notificaciones marcadas como leídas",
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notificaciones/:id/clic - Registrar clic en notificación
router.put("/:id/clic", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notificacion = await Notificacion.findOne({
      _id: id,
      usuarioId: req.usuario._id,
    });

    if (!notificacion) {
      return res.status(404).json({
        success: false,
        error: "Notificación no encontrada",
      });
    }

    await notificacion.incrementarClic();

    res.json({
      success: true,
      message: "Clic registrado exitosamente",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notificaciones/:id - Eliminar notificación
router.delete("/:id", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notificacion = await Notificacion.findOneAndDelete({
      _id: id,
      usuarioId: req.usuario._id,
    });

    if (!notificacion) {
      return res.status(404).json({
        success: false,
        error: "Notificación no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Notificación eliminada exitosamente",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notificaciones/eliminar-todas - Eliminar todas las notificaciones del usuario
router.delete(
  "/eliminar-todas",
  verificarFirebaseAuth,
  async (req, res, next) => {
    try {
      const resultado = await Notificacion.deleteMany({
        usuarioId: req.usuario._id,
      });

      res.json({
        success: true,
        data: {
          eliminadas: resultado.deletedCount,
        },
        message: `${resultado.deletedCount} notificaciones eliminadas`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/notificaciones/estadisticas/globales - Obtener estadísticas globales (Solo admin)
router.get(
  "/estadisticas/globales",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const estadisticas = await Notificacion.obtenerEstadisticas();

      res.json({
        success: true,
        data: estadisticas,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

