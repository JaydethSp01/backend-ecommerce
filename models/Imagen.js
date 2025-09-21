const mongoose = require("mongoose");

const imagenSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "La URL de la imagen es requerida"],
      trim: true,
    },
    nombre: {
      type: String,
      required: [true, "El nombre de la imagen es requerido"],
      trim: true,
      maxlength: [200, "El nombre no puede exceder 200 caracteres"],
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [500, "La descripción no puede exceder 500 caracteres"],
    },
    tipoProductoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TipoProducto",
      required: [true, "El tipo de producto es requerido"],
    },
    productoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Producto",
      default: null,
    },
    tipo: {
      type: String,
      enum: ["PRINCIPAL", "SECUNDARIA", "GALERIA", "MINIATURA"],
      default: "GALERIA",
    },
    orden: {
      type: Number,
      default: 0,
    },
    activa: {
      type: Boolean,
      default: true,
    },
    // Metadatos de la imagen
    metadatos: {
      tamaño: {
        type: Number, // en bytes
        min: 0,
      },
      ancho: {
        type: Number,
        min: 1,
      },
      alto: {
        type: Number,
        min: 1,
      },
      formato: {
        type: String,
        enum: ["JPEG", "PNG", "WEBP", "GIF", "SVG"],
        default: "JPEG",
      },
      calidad: {
        type: Number,
        min: 1,
        max: 100,
        default: 85,
      },
    },
    // Campos para optimización
    urlOptimizada: {
      type: String,
      trim: true,
    },
    urlThumbnail: {
      type: String,
      trim: true,
    },
    // Campos para CDN/almacenamiento
    proveedor: {
      type: String,
      enum: ["LOCAL", "CLOUDINARY", "AWS_S3", "FIREBASE_STORAGE"],
      default: "LOCAL",
    },
    idExterno: {
      type: String, // ID en el servicio externo
      trim: true,
    },
    // Campos para SEO
    alt: {
      type: String,
      trim: true,
      maxlength: [200, "El texto alternativo no puede exceder 200 caracteres"],
    },
    titulo: {
      type: String,
      trim: true,
      maxlength: [200, "El título no puede exceder 200 caracteres"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices
imagenSchema.index({ tipoProductoId: 1 });
imagenSchema.index({ productoId: 1 });
imagenSchema.index({ tipo: 1 });
imagenSchema.index({ activa: 1 });
imagenSchema.index({ orden: 1 });

// Virtual para obtener la URL completa
imagenSchema.virtual("urlCompleta").get(function () {
  if (this.url.startsWith("http")) {
    return this.url;
  }
  return `${process.env.BASE_URL || "http://localhost:8080"}${this.url}`;
});

// Virtual para obtener la URL optimizada
imagenSchema.virtual("urlOptimizadaCompleta").get(function () {
  if (this.urlOptimizada) {
    if (this.urlOptimizada.startsWith("http")) {
      return this.urlOptimizada;
    }
    return `${process.env.BASE_URL || "http://localhost:8080"}${
      this.urlOptimizada
    }`;
  }
  return this.urlCompleta;
});

// Virtual para obtener la URL del thumbnail
imagenSchema.virtual("urlThumbnailCompleta").get(function () {
  if (this.urlThumbnail) {
    if (this.urlThumbnail.startsWith("http")) {
      return this.urlThumbnail;
    }
    return `${process.env.BASE_URL || "http://localhost:8080"}${
      this.urlThumbnail
    }`;
  }
  return this.urlCompleta;
});

// Método estático para obtener imágenes por tipo de producto
imagenSchema.statics.obtenerPorTipoProducto = function (
  tipoProductoId,
  tipo = null
) {
  const query = {
    tipoProductoId,
    activa: true,
  };

  if (tipo) {
    query.tipo = tipo;
  }

  return this.find(query)
    .populate("tipoProductoId")
    .sort({ orden: 1, createdAt: 1 });
};

// Método estático para obtener imágenes por producto
imagenSchema.statics.obtenerPorProducto = function (productoId, tipo = null) {
  const query = {
    productoId,
    activa: true,
  };

  if (tipo) {
    query.tipo = tipo;
  }

  return this.find(query)
    .populate("productoId")
    .sort({ orden: 1, createdAt: 1 });
};

// Método para marcar como principal
imagenSchema.methods.marcarComoPrincipal = async function () {
  const Imagen = mongoose.model("Imagen");

  // Primero, desmarcar todas las imágenes principales del mismo producto/tipo
  await Imagen.updateMany(
    {
      $or: [
        { productoId: this.productoId },
        { tipoProductoId: this.tipoProductoId },
      ],
      _id: { $ne: this._id },
    },
    { tipo: "GALERIA" }
  );

  // Marcar esta imagen como principal
  this.tipo = "PRINCIPAL";
  return this.save();
};

// Método para generar URLs optimizadas
imagenSchema.methods.generarUrlsOptimizadas = function () {
  if (this.proveedor === "CLOUDINARY") {
    // Ejemplo para Cloudinary
    const baseUrl = this.url.split("/upload/")[0] + "/upload/";
    const publicId = this.url.split("/upload/")[1];

    this.urlOptimizada = `${baseUrl}w_800,h_600,c_fill,q_auto,f_auto/${publicId}`;
    this.urlThumbnail = `${baseUrl}w_300,h_300,c_fill,q_auto,f_auto/${publicId}`;
  } else if (this.proveedor === "AWS_S3") {
    // Ejemplo para AWS S3
    this.urlOptimizada = this.url.replace("/original/", "/optimized/");
    this.urlThumbnail = this.url.replace("/original/", "/thumbnails/");
  }

  return this.save();
};

module.exports = mongoose.model("Imagen", imagenSchema);

