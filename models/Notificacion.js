const mongoose = require("mongoose");

const notificacionSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El ID del usuario es requerido"],
    },
    titulo: {
      type: String,
      required: [true, "El título es requerido"],
      trim: true,
      maxlength: [200, "El título no puede exceder 200 caracteres"],
    },
    mensaje: {
      type: String,
      required: [true, "El mensaje es requerido"],
      trim: true,
      maxlength: [1000, "El mensaje no puede exceder 1000 caracteres"],
    },
    tipo: {
      type: String,
      enum: [
        "INFO",
        "SUCCESS",
        "WARNING",
        "ERROR",
        "PROMOCION",
        "STOCK",
        "OFERTA",
        "SISTEMA",
      ],
      default: "INFO",
    },
    leida: {
      type: Boolean,
      default: false,
    },
    fechaLeida: {
      type: Date,
      default: null,
    },
    urlAccion: {
      type: String,
      trim: true,
      maxlength: [500, "La URL de acción no puede exceder 500 caracteres"],
    },
    textoAccion: {
      type: String,
      trim: true,
      maxlength: [50, "El texto de acción no puede exceder 50 caracteres"],
    },
    // Campos para funcionalidades avanzadas
    prioridad: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    expiracion: {
      type: Date,
      default: null,
    },
    // Campos para notificaciones push
    push: {
      enviada: {
        type: Boolean,
        default: false,
      },
      fechaEnvio: {
        type: Date,
        default: null,
      },
      tokenDispositivo: {
        type: String,
        trim: true,
      },
    },
    // Campos para notificaciones por email
    email: {
      enviada: {
        type: Boolean,
        default: false,
      },
      fechaEnvio: {
        type: Date,
        default: null,
      },
      asunto: {
        type: String,
        trim: true,
        maxlength: [200, "El asunto no puede exceder 200 caracteres"],
      },
    },
    // Campos para agrupación
    categoria: {
      type: String,
      enum: ["PEDIDO", "PRODUCTO", "CUENTA", "PROMOCION", "SISTEMA", "OTRO"],
      default: "OTRO",
    },
    grupoId: {
      type: String,
      trim: true,
    },
    // Campos para internacionalización
    traducciones: {
      es: {
        titulo: String,
        mensaje: String,
        textoAccion: String,
      },
      en: {
        titulo: String,
        mensaje: String,
        textoAccion: String,
      },
      fr: {
        titulo: String,
        mensaje: String,
        textoAccion: String,
      },
      pt: {
        titulo: String,
        mensaje: String,
        textoAccion: String,
      },
    },
    // Campos para análisis
    interacciones: {
      clics: {
        type: Number,
        default: 0,
      },
      ultimoClick: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices
notificacionSchema.index({ usuarioId: 1, leida: 1 });
notificacionSchema.index({ usuarioId: 1, createdAt: -1 });
notificacionSchema.index({ tipo: 1 });
notificacionSchema.index({ prioridad: -1 });
notificacionSchema.index({ expiracion: 1 });
notificacionSchema.index({ grupoId: 1 });
notificacionSchema.index({ categoria: 1 });

// Virtual para verificar si está expirada
notificacionSchema.virtual("expirada").get(function () {
  return this.expiracion && this.expiracion < new Date();
});

// Virtual para obtener el tiempo transcurrido
notificacionSchema.virtual("tiempoTranscurrido").get(function () {
  const ahora = new Date();
  const diferencia = ahora - this.createdAt;

  const minutos = Math.floor(diferencia / 60000);
  const horas = Math.floor(diferencia / 3600000);
  const dias = Math.floor(diferencia / 86400000);

  if (dias > 0) return `${dias} día${dias > 1 ? "s" : ""}`;
  if (horas > 0) return `${horas} hora${horas > 1 ? "s" : ""}`;
  if (minutos > 0) return `${minutos} minuto${minutos > 1 ? "s" : ""}`;
  return "Hace un momento";
});

// Método estático para crear notificación
notificacionSchema.statics.crearNotificacion = async function (datos) {
  try {
    const notificacion = new this(datos);
    return await notificacion.save();
  } catch (error) {
    throw error;
  }
};

// Método estático para obtener notificaciones de un usuario
notificacionSchema.statics.obtenerNotificacionesUsuario = function (
  usuarioId,
  opciones = {}
) {
  const query = {
    usuarioId,
    $or: [{ expiracion: null }, { expiracion: { $gt: new Date() } }],
  };

  if (opciones.soloNoLeidas) {
    query.leida = false;
  }

  if (opciones.tipo) {
    query.tipo = opciones.tipo;
  }

  if (opciones.categoria) {
    query.categoria = opciones.categoria;
  }

  return this.find(query)
    .sort({ prioridad: -1, createdAt: -1 })
    .limit(opciones.limite || 50)
    .skip(opciones.desplazamiento || 0);
};

// Método estático para obtener notificaciones no leídas
notificacionSchema.statics.obtenerNoLeidas = function (usuarioId) {
  return this.find({
    usuarioId,
    leida: false,
    $or: [{ expiracion: null }, { expiracion: { $gt: new Date() } }],
  }).sort({ prioridad: -1, createdAt: -1 });
};

// Método estático para marcar como leída
notificacionSchema.statics.marcarComoLeida = async function (
  notificacionId,
  usuarioId
) {
  try {
    const notificacion = await this.findOneAndUpdate(
      { _id: notificacionId, usuarioId },
      {
        leida: true,
        fechaLeida: new Date(),
      },
      { new: true }
    );

    if (!notificacion) {
      throw new Error("Notificación no encontrada");
    }

    return notificacion;
  } catch (error) {
    throw error;
  }
};

// Método estático para marcar todas como leídas
notificacionSchema.statics.marcarTodasComoLeidas = async function (usuarioId) {
  try {
    const resultado = await this.updateMany(
      { usuarioId, leida: false },
      {
        leida: true,
        fechaLeida: new Date(),
      }
    );

    return resultado;
  } catch (error) {
    throw error;
  }
};

// Método estático para crear notificación masiva
notificacionSchema.statics.crearNotificacionMasiva = async function (
  usuariosIds,
  datos
) {
  try {
    const notificaciones = usuariosIds.map((usuarioId) => ({
      usuarioId,
      ...datos,
    }));

    return await this.insertMany(notificaciones);
  } catch (error) {
    throw error;
  }
};

// Método estático para obtener estadísticas
notificacionSchema.statics.obtenerEstadisticas = async function (
  usuarioId = null
) {
  const matchStage = {};
  if (usuarioId) {
    matchStage.usuarioId = usuarioId;
  }

  const estadisticas = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        noLeidas: {
          $sum: { $cond: [{ $eq: ["$leida", false] }, 1, 0] },
        },
        porTipo: {
          $push: {
            tipo: "$tipo",
            leida: "$leida",
          },
        },
      },
    },
    {
      $project: {
        total: 1,
        noLeidas: 1,
        leidas: { $subtract: ["$total", "$noLeidas"] },
        tipos: {
          $reduce: {
            input: "$porTipo",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $arrayToObject: [
                    [
                      {
                        k: "$$this.tipo",
                        v: {
                          $add: [
                            {
                              $ifNull: [
                                {
                                  $getField: {
                                    field: "$$this.tipo",
                                    input: "$$value",
                                  },
                                },
                                0,
                              ],
                            },
                            1,
                          ],
                        },
                      },
                    ],
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ]);

  return (
    estadisticas[0] || {
      total: 0,
      noLeidas: 0,
      leidas: 0,
      tipos: {},
    }
  );
};

// Método para marcar como leída
notificacionSchema.methods.marcarComoLeida = function () {
  this.leida = true;
  this.fechaLeida = new Date();
  return this.save();
};

// Método para incrementar clics
notificacionSchema.methods.incrementarClic = function () {
  this.interacciones.clics += 1;
  this.interacciones.ultimoClick = new Date();
  return this.save();
};

// Método para verificar si se puede mostrar
notificacionSchema.methods.puedeMostrar = function () {
  if (this.expirada) {
    return false;
  }

  return true;
};

// Método para obtener texto traducido
notificacionSchema.methods.obtenerTextoTraducido = function (
  idioma = "es",
  campo = "mensaje"
) {
  if (
    this.traducciones &&
    this.traducciones[idioma] &&
    this.traducciones[idioma][campo]
  ) {
    return this.traducciones[idioma][campo];
  }

  return this[campo];
};

module.exports = mongoose.model("Notificacion", notificacionSchema);

