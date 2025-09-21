const mongoose = require("mongoose");

const tipoProductoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del tipo de producto es requerido"],
      trim: true,
      unique: true,
      maxlength: [100, "El nombre no puede exceder 100 caracteres"],
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [500, "La descripción no puede exceder 500 caracteres"],
    },
    activo: {
      type: Boolean,
      default: true,
    },
    orden: {
      type: Number,
      default: 0,
    },
    // Campos para internacionalización
    traducciones: {
      es: {
        nombre: String,
        descripcion: String,
      },
      en: {
        nombre: String,
        descripcion: String,
      },
      fr: {
        nombre: String,
        descripcion: String,
      },
      pt: {
        nombre: String,
        descripcion: String,
      },
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
    // Estadísticas
    totalProductos: {
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

// Índices
tipoProductoSchema.index({ nombre: 1 });
tipoProductoSchema.index({ activo: 1 });
tipoProductoSchema.index({ orden: 1 });
tipoProductoSchema.index({ slug: 1 });

// Middleware para generar slug automáticamente
tipoProductoSchema.pre("save", function (next) {
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

// Virtual para obtener el nombre traducido
tipoProductoSchema.virtual("nombreTraducido").get(function () {
  // Por ahora retornamos el nombre en español, pero se puede implementar lógica de idioma
  return this.nombre;
});

// Método estático para obtener tipos activos ordenados
tipoProductoSchema.statics.obtenerActivos = function () {
  return this.find({ activo: true }).sort({ orden: 1, nombre: 1 });
};

// Método para actualizar contador de productos
tipoProductoSchema.methods.actualizarContadorProductos = async function () {
  const Producto = mongoose.model("Producto");
  const count = await Producto.countDocuments({
    tipoProductoId: this._id,
    activo: true,
  });
  this.totalProductos = count;
  return this.save();
};

module.exports = mongoose.model("TipoProducto", tipoProductoSchema);

