const mongoose = require("mongoose");

const favoritoSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El ID del usuario es requerido"],
    },
    productoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Producto",
      required: [true, "El ID del producto es requerido"],
    },
    fechaAgregado: {
      type: Date,
      default: Date.now,
    },
    activo: {
      type: Boolean,
      default: true,
    },
    // Campos adicionales para funcionalidades avanzadas
    notas: {
      type: String,
      trim: true,
      maxlength: [500, "Las notas no pueden exceder 500 caracteres"],
    },
    prioridad: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    // Campos para notificaciones
    notificarOferta: {
      type: Boolean,
      default: true,
    },
    notificarStock: {
      type: Boolean,
      default: true,
    },
    // Campos para análisis
    vecesVisto: {
      type: Number,
      default: 0,
    },
    ultimaVista: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices compuestos para optimizar consultas
favoritoSchema.index({ usuarioId: 1, productoId: 1 }, { unique: true });
favoritoSchema.index({ usuarioId: 1, activo: 1 });
favoritoSchema.index({ productoId: 1, activo: 1 });
favoritoSchema.index({ fechaAgregado: -1 });

// Virtual para obtener información del producto
favoritoSchema.virtual("producto", {
  ref: "Producto",
  localField: "productoId",
  foreignField: "_id",
  justOne: true,
});

// Virtual para obtener información del usuario
favoritoSchema.virtual("usuario", {
  ref: "Usuario",
  localField: "usuarioId",
  foreignField: "_id",
  justOne: true,
});

// Método estático para agregar a favoritos
favoritoSchema.statics.agregarFavorito = async function (
  usuarioId,
  productoId,
  datosAdicionales = {}
) {
  try {
    // Verificar si ya existe
    const existente = await this.findOne({
      usuarioId,
      productoId,
      activo: true,
    });

    if (existente) {
      throw new Error("El producto ya está en favoritos");
    }

    // Crear nuevo favorito
    const favorito = new this({
      usuarioId,
      productoId,
      ...datosAdicionales,
    });

    return await favorito.save();
  } catch (error) {
    throw error;
  }
};

// Método estático para remover de favoritos
favoritoSchema.statics.removerFavorito = async function (
  usuarioId,
  productoId
) {
  try {
    const resultado = await this.findOneAndUpdate(
      { usuarioId, productoId, activo: true },
      { activo: false },
      { new: true }
    );

    if (!resultado) {
      throw new Error("Favorito no encontrado");
    }

    return resultado;
  } catch (error) {
    throw error;
  }
};

// Método estático para obtener favoritos de un usuario
favoritoSchema.statics.obtenerFavoritosUsuario = function (
  usuarioId,
  opciones = {}
) {
  const query = { usuarioId, activo: true };

  return this.find(query)
    .populate({
      path: "productoId",
      populate: {
        path: "tipoProductoId",
        model: "TipoProducto",
      },
    })
    .sort({ fechaAgregado: -1 })
    .limit(opciones.limite || 50)
    .skip(opciones.desplazamiento || 0);
};

// Método estático para obtener usuarios que tienen un producto en favoritos
favoritoSchema.statics.obtenerUsuariosFavorito = function (
  productoId,
  opciones = {}
) {
  const query = { productoId, activo: true };

  return this.find(query)
    .populate("usuarioId", "nombre email")
    .sort({ fechaAgregado: -1 })
    .limit(opciones.limite || 50)
    .skip(opciones.desplazamiento || 0);
};

// Método estático para verificar si un producto está en favoritos
favoritoSchema.statics.estaEnFavoritos = function (usuarioId, productoId) {
  return this.findOne({
    usuarioId,
    productoId,
    activo: true,
  });
};

// Método estático para obtener estadísticas de favoritos
favoritoSchema.statics.obtenerEstadisticas = async function (usuarioId = null) {
  const matchStage = { activo: true };
  if (usuarioId) {
    matchStage.usuarioId = usuarioId;
  }

  const estadisticas = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalFavoritos: { $sum: 1 },
        productosUnicos: { $addToSet: "$productoId" },
        usuariosUnicos: { $addToSet: "$usuarioId" },
      },
    },
    {
      $project: {
        totalFavoritos: 1,
        totalProductosUnicos: { $size: "$productosUnicos" },
        totalUsuariosUnicos: { $size: "$usuariosUnicos" },
      },
    },
  ]);

  return (
    estadisticas[0] || {
      totalFavoritos: 0,
      totalProductosUnicos: 0,
      totalUsuariosUnicos: 0,
    }
  );
};

// Método para incrementar contador de vistas
favoritoSchema.methods.incrementarVista = function () {
  this.vecesVisto += 1;
  this.ultimaVista = new Date();
  return this.save();
};

// Método para actualizar prioridad
favoritoSchema.methods.actualizarPrioridad = function (nuevaPrioridad) {
  if (nuevaPrioridad >= 1 && nuevaPrioridad <= 5) {
    this.prioridad = nuevaPrioridad;
    return this.save();
  }
  throw new Error("La prioridad debe estar entre 1 y 5");
};

// Método para actualizar configuraciones de notificación
favoritoSchema.methods.actualizarNotificaciones = function (configuracion) {
  if (configuracion.notificarOferta !== undefined) {
    this.notificarOferta = configuracion.notificarOferta;
  }
  if (configuracion.notificarStock !== undefined) {
    this.notificarStock = configuracion.notificarStock;
  }
  return this.save();
};

module.exports = mongoose.model("Favorito", favoritoSchema);

