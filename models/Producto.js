const mongoose = require("mongoose");

const productoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del producto es requerido"],
      trim: true,
      maxlength: [200, "El nombre no puede exceder 200 caracteres"],
    },
    descripcion: {
      type: String,
      required: [true, "La descripción es requerida"],
      trim: true,
      maxlength: [1000, "La descripción no puede exceder 1000 caracteres"],
    },
    precio: {
      type: Number,
      required: [true, "El precio es requerido"],
      min: [0, "El precio no puede ser negativo"],
    },
    stock: {
      type: Number,
      required: [true, "El stock es requerido"],
      min: [0, "El stock no puede ser negativo"],
      default: 0,
    },
    tipoProductoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TipoProducto",
      required: [true, "El tipo de producto es requerido"],
    },
    marca: {
      type: String,
      trim: true,
      maxlength: [100, "La marca no puede exceder 100 caracteres"],
    },
    modelo: {
      type: String,
      trim: true,
      maxlength: [100, "El modelo no puede exceder 100 caracteres"],
    },
    tallas: [
      {
        type: String,
        trim: true,
      },
    ],
    colores: [
      {
        type: String,
        trim: true,
      },
    ],
    material: {
      type: String,
      trim: true,
      maxlength: [100, "El material no puede exceder 100 caracteres"],
    },
    genero: {
      type: String,
      enum: ["HOMBRE", "MUJER", "UNISEX", "NIÑO", "NIÑA"],
      default: "UNISEX",
    },
    edad: {
      type: String,
      enum: ["ADULTO", "NIÑO", "BEBE"],
      default: "ADULTO",
    },
    temporada: {
      type: String,
      enum: ["PRIMAVERA", "VERANO", "OTOÑO", "INVIERNO", "TODO_EL_AÑO"],
      default: "TODO_EL_AÑO",
    },
    activo: {
      type: Boolean,
      default: true,
    },
    destacado: {
      type: Boolean,
      default: false,
    },
    oferta: {
      activa: {
        type: Boolean,
        default: false,
      },
      descuento: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      precioOferta: {
        type: Number,
        min: 0,
      },
      fechaInicio: Date,
      fechaFin: Date,
    },
    // Campos para SEO
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    metaDescripcion: {
      type: String,
      maxlength: [160, "La meta descripción no puede exceder 160 caracteres"],
    },
    palabrasClave: [String],
    // Campos para estadísticas
    vistas: {
      type: Number,
      default: 0,
    },
    ventas: {
      type: Number,
      default: 0,
    },
    calificacionPromedio: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalCalificaciones: {
      type: Number,
      default: 0,
    },
    // Campos para internacionalización
    traducciones: {
      es: {
        nombre: String,
        descripcion: String,
        metaDescripcion: String,
      },
      en: {
        nombre: String,
        descripcion: String,
        metaDescripcion: String,
      },
      fr: {
        nombre: String,
        descripcion: String,
        metaDescripcion: String,
      },
      pt: {
        nombre: String,
        descripcion: String,
        metaDescripcion: String,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices para optimizar consultas
productoSchema.index({ nombre: "text", descripcion: "text" });
productoSchema.index({ tipoProductoId: 1 });
productoSchema.index({ precio: 1 });
productoSchema.index({ activo: 1 });
productoSchema.index({ destacado: 1 });
productoSchema.index({ "oferta.activa": 1 });
productoSchema.index({ genero: 1 });
productoSchema.index({ marca: 1 });
productoSchema.index({ slug: 1 });

// Middleware para generar slug automáticamente
productoSchema.pre("save", function (next) {
  if (this.isModified("nombre") && !this.slug) {
    this.slug = this.nombre
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }
  next();
});

// Virtual para calcular precio con descuento
productoSchema.virtual("precioFinal").get(function () {
  if (this.oferta.activa && this.oferta.descuento > 0) {
    return this.precio * (1 - this.oferta.descuento / 100);
  }
  return this.precio;
});

// Virtual para verificar si está en oferta
productoSchema.virtual("enOferta").get(function () {
  const ahora = new Date();
  return (
    this.oferta.activa &&
    (!this.oferta.fechaInicio || this.oferta.fechaInicio <= ahora) &&
    (!this.oferta.fechaFin || this.oferta.fechaFin >= ahora)
  );
});

// Método para incrementar vistas
productoSchema.methods.incrementarVistas = function () {
  this.vistas += 1;
  return this.save();
};

// Método para actualizar calificación
productoSchema.methods.actualizarCalificacion = function (nuevaCalificacion) {
  const totalActual = this.calificacionPromedio * this.totalCalificaciones;
  this.totalCalificaciones += 1;
  this.calificacionPromedio =
    (totalActual + nuevaCalificacion) / this.totalCalificaciones;
  return this.save();
};

// Método estático para buscar productos por texto
productoSchema.statics.buscarPorTexto = function (texto, idioma = "es") {
  const query = {
    activo: true,
    $or: [
      { nombre: { $regex: texto, $options: "i" } },
      { descripcion: { $regex: texto, $options: "i" } },
      { marca: { $regex: texto, $options: "i" } },
      { [`traducciones.${idioma}.nombre`]: { $regex: texto, $options: "i" } },
      {
        [`traducciones.${idioma}.descripcion`]: {
          $regex: texto,
          $options: "i",
        },
      },
    ],
  };

  return this.find(query).populate("tipoProductoId");
};

// Método estático para obtener productos destacados
productoSchema.statics.obtenerDestacados = function (limite = 10) {
  return this.find({ activo: true, destacado: true })
    .populate("tipoProductoId")
    .sort({ createdAt: -1 })
    .limit(limite);
};

// Método estático para obtener productos en oferta
productoSchema.statics.obtenerEnOferta = function (limite = 10) {
  const ahora = new Date();
  return this.find({
    activo: true,
    "oferta.activa": true,
    $or: [
      { "oferta.fechaInicio": { $exists: false } },
      { "oferta.fechaInicio": { $lte: ahora } },
    ],
    $or: [
      { "oferta.fechaFin": { $exists: false } },
      { "oferta.fechaFin": { $gte: ahora } },
    ],
  })
    .populate("tipoProductoId")
    .sort({ "oferta.descuento": -1 })
    .limit(limite);
};

module.exports = mongoose.model("Producto", productoSchema);

