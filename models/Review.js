const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Producto",
      required: true,
      index: true,
    },
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    nombreUsuario: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    emailUsuario: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    calificacion: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "La calificación debe ser un número entero",
      },
    },
    titulo: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    comentario: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    fecha: {
      type: Date,
      default: Date.now,
      index: true,
    },
    util: {
      type: Number,
      default: 0,
      min: 0,
    },
    noUtil: {
      type: Number,
      default: 0,
      min: 0,
    },
    verificada: {
      type: Boolean,
      default: false,
    },
    compraVerificada: {
      type: Boolean,
      default: false,
    },
    activa: {
      type: Boolean,
      default: true,
    },
    reportada: {
      type: Boolean,
      default: false,
    },
    motivoReporte: {
      type: String,
      trim: true,
    },
    respuestaAdmin: {
      texto: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      fecha: {
        type: Date,
      },
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
      },
    },
    // Metadatos adicionales
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    // Para análisis
    tiempoLectura: {
      type: Number, // en segundos
      default: 0,
    },
    compartida: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices compuestos para optimizar consultas
reviewSchema.index({ productoId: 1, activa: 1, fecha: -1 });
reviewSchema.index({ usuarioId: 1, activa: 1 });
reviewSchema.index({ calificacion: 1, activa: 1 });
reviewSchema.index({ verificada: 1, activa: 1 });

// Virtual para calcular el porcentaje de utilidad
reviewSchema.virtual("porcentajeUtilidad").get(function () {
  const total = this.util + this.noUtil;
  if (total === 0) return 0;
  return Math.round((this.util / total) * 100);
});

// Virtual para obtener el nombre del producto
reviewSchema.virtual("producto", {
  ref: "Producto",
  localField: "productoId",
  foreignField: "_id",
  justOne: true,
});

// Virtual para obtener el usuario
reviewSchema.virtual("usuario", {
  ref: "Usuario",
  localField: "usuarioId",
  foreignField: "_id",
  justOne: true,
});

// Métodos estáticos
reviewSchema.statics.obtenerReviewsProducto = async function (
  productoId,
  opciones = {}
) {
  const {
    pagina = 1,
    limite = 10,
    ordenar = "fecha",
    direccion = "desc",
    calificacion = null,
    verificadas = null,
  } = opciones;

  const skip = (pagina - 1) * limite;
  const sort = { [ordenar]: direccion === "desc" ? -1 : 1 };

  const filtros = {
    productoId: new mongoose.Types.ObjectId(productoId),
    activa: true,
  };

  if (calificacion) {
    filtros.calificacion = parseInt(calificacion);
  }

  if (verificadas !== null) {
    filtros.verificada = verificadas === "true";
  }

  const reviews = await this.find(filtros)
    .populate("usuario", "nombre email")
    .sort(sort)
    .skip(skip)
    .limit(limite)
    .lean();

  const total = await this.countDocuments(filtros);

  return {
    reviews,
    paginacion: {
      pagina,
      limite,
      total,
      paginas: Math.ceil(total / limite),
    },
  };
};

reviewSchema.statics.obtenerEstadisticasProducto = async function (productoId) {
  const estadisticas = await this.aggregate([
    {
      $match: {
        productoId: new mongoose.Types.ObjectId(productoId),
        activa: true,
      },
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        promedioCalificacion: { $avg: "$calificacion" },
        distribucionCalificaciones: {
          $push: "$calificacion",
        },
        totalUtil: { $sum: "$util" },
        totalNoUtil: { $sum: "$noUtil" },
        reviewsVerificadas: {
          $sum: { $cond: ["$verificada", 1, 0] },
        },
        reviewsConCompras: {
          $sum: { $cond: ["$compraVerificada", 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalReviews: 1,
        promedioCalificacion: { $round: ["$promedioCalificacion", 1] },
        distribucionCalificaciones: 1,
        totalUtil: 1,
        totalNoUtil: 1,
        reviewsVerificadas: 1,
        reviewsConCompras: 1,
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

  if (estadisticas.length === 0) {
    return {
      totalReviews: 0,
      promedioCalificacion: 0,
      distribucionCalificaciones: [0, 0, 0, 0, 0],
      totalUtil: 0,
      totalNoUtil: 0,
      reviewsVerificadas: 0,
      reviewsConCompras: 0,
      porcentajeUtilidad: 0,
    };
  }

  const stats = estadisticas[0];
  
  // Calcular distribución de calificaciones
  const distribucion = [0, 0, 0, 0, 0];
  stats.distribucionCalificaciones.forEach((calificacion) => {
    if (calificacion >= 1 && calificacion <= 5) {
      distribucion[calificacion - 1]++;
    }
  });

  return {
    ...stats,
    distribucionCalificaciones: distribucion,
  };
};

reviewSchema.statics.obtenerReviewsUsuario = async function (
  usuarioId,
  opciones = {}
) {
  const { pagina = 1, limite = 10 } = opciones;
  const skip = (pagina - 1) * limite;

  const reviews = await this.find({
    usuarioId: new mongoose.Schema.Types.ObjectId(usuarioId),
    activa: true,
  })
    .populate("producto", "nombre marca precio imagenId")
    .sort({ fecha: -1 })
    .skip(skip)
    .limit(limite)
    .lean();

  const total = await this.countDocuments({
    usuarioId: new mongoose.Schema.Types.ObjectId(usuarioId),
    activa: true,
  });

  return {
    reviews,
    paginacion: {
      pagina,
      limite,
      total,
      paginas: Math.ceil(total / limite),
    },
  };
};

// Métodos de instancia
reviewSchema.methods.marcarUtil = async function (esUtil) {
  if (esUtil) {
    this.util += 1;
  } else {
    this.noUtil += 1;
  }
  return this.save();
};

reviewSchema.methods.verificarCompra = async function () {
  this.compraVerificada = true;
  this.verificada = true;
  return this.save();
};

reviewSchema.methods.reportar = async function (motivo) {
  this.reportada = true;
  this.motivoReporte = motivo;
  return this.save();
};

reviewSchema.methods.responderAdmin = async function (texto, adminId) {
  this.respuestaAdmin = {
    texto,
    fecha: new Date(),
    adminId,
  };
  return this.save();
};

// Middleware pre-save
reviewSchema.pre("save", function (next) {
  // Validar que no se pueda hacer más de una review por producto por usuario
  if (this.isNew) {
    this.constructor
      .findOne({
        productoId: this.productoId,
        usuarioId: this.usuarioId,
        activa: true,
      })
      .then((existingReview) => {
        if (existingReview) {
          const error = new Error(
            "Ya has escrito una reseña para este producto"
          );
          return next(error);
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

// Middleware post-save para actualizar estadísticas del producto
reviewSchema.post("save", async function (doc) {
  if (doc.isNew) {
    try {
      const Producto = mongoose.model("Producto");
      const estadisticas = await this.constructor.obtenerEstadisticasProducto(
        doc.productoId
      );
      
      await Producto.findByIdAndUpdate(doc.productoId, {
        $set: {
          calificacionPromedio: estadisticas.promedioCalificacion,
          totalCalificaciones: estadisticas.totalReviews,
        },
      });
    } catch (error) {
      console.error("Error actualizando estadísticas del producto:", error);
    }
  }
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;



