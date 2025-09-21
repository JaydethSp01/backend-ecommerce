const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El ID del usuario es requerido"],
    },
    nombre: {
      type: String,
      required: [true, "El nombre de la wishlist es requerido"],
      trim: true,
      maxlength: [100, "El nombre no puede exceder 100 caracteres"],
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [500, "La descripción no puede exceder 500 caracteres"],
    },
    productos: [
      {
        productoId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Producto",
          required: true,
        },
        fechaAgregado: {
          type: Date,
          default: Date.now,
        },
        notas: {
          type: String,
          trim: true,
          maxlength: [200, "Las notas no pueden exceder 200 caracteres"],
        },
        prioridad: {
          type: Number,
          min: 1,
          max: 5,
          default: 3,
        },
        cantidad: {
          type: Number,
          min: 1,
          default: 1,
        },
      },
    ],
    activa: {
      type: Boolean,
      default: true,
    },
    publica: {
      type: Boolean,
      default: false,
    },
    // Campos para funcionalidades avanzadas
    compartir: {
      codigo: {
        type: String,
        unique: true,
        sparse: true,
      },
      fechaExpiracion: Date,
      maxUsos: {
        type: Number,
        default: 0, // 0 = ilimitado
      },
      usosActuales: {
        type: Number,
        default: 0,
      },
    },
    // Campos para notificaciones
    notificaciones: {
      ofertas: {
        type: Boolean,
        default: true,
      },
      stock: {
        type: Boolean,
        default: true,
      },
      nuevosProductos: {
        type: Boolean,
        default: false,
      },
    },
    // Campos para análisis
    vistas: {
      type: Number,
      default: 0,
    },
    ultimaVista: {
      type: Date,
      default: null,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices
wishlistSchema.index({ usuarioId: 1, activa: 1 });
wishlistSchema.index({ "productos.productoId": 1 });
wishlistSchema.index({ publica: 1 });
wishlistSchema.index({ "compartir.codigo": 1 });
wishlistSchema.index({ createdAt: -1 });

// Virtual para obtener el número de productos
wishlistSchema.virtual("totalProductos").get(function () {
  return this.productos.length;
});

// Virtual para obtener el valor total estimado
wishlistSchema.virtual("valorTotal").get(function () {
  // Este virtual se puede calcular cuando se populen los productos
  return 0;
});

// Middleware para generar código de compartir
wishlistSchema.pre("save", function (next) {
  if (this.isModified("publica") && this.publica && !this.compartir.codigo) {
    this.compartir.codigo = this._id.toString().slice(-8).toUpperCase();
  }
  next();
});

// Método estático para crear wishlist
wishlistSchema.statics.crearWishlist = async function (usuarioId, datos) {
  try {
    const wishlist = new this({
      usuarioId,
      ...datos,
    });

    return await wishlist.save();
  } catch (error) {
    throw error;
  }
};

// Método estático para obtener wishlists de un usuario
wishlistSchema.statics.obtenerWishlistsUsuario = function (
  usuarioId,
  opciones = {}
) {
  const query = { usuarioId, activa: true };

  return this.find(query)
    .populate({
      path: "productos.productoId",
      populate: {
        path: "tipoProductoId",
        model: "TipoProducto",
      },
    })
    .sort({ createdAt: -1 })
    .limit(opciones.limite || 20)
    .skip(opciones.desplazamiento || 0);
};

// Método estático para obtener wishlist pública por código
wishlistSchema.statics.obtenerWishlistPublica = function (codigo) {
  return this.findOne({
    "compartir.codigo": codigo,
    publica: true,
    activa: true,
  })
    .populate({
      path: "productos.productoId",
      populate: {
        path: "tipoProductoId",
        model: "TipoProducto",
      },
    })
    .populate("usuarioId", "nombre");
};

// Método para agregar producto a la wishlist
wishlistSchema.methods.agregarProducto = async function (
  productoId,
  datosAdicionales = {}
) {
  try {
    // Verificar si el producto ya está en la wishlist
    const productoExistente = this.productos.find(
      (p) => p.productoId.toString() === productoId.toString()
    );

    if (productoExistente) {
      throw new Error("El producto ya está en esta wishlist");
    }

    // Agregar el producto
    this.productos.push({
      productoId,
      ...datosAdicionales,
    });

    return await this.save();
  } catch (error) {
    throw error;
  }
};

// Método para remover producto de la wishlist
wishlistSchema.methods.removerProducto = async function (productoId) {
  try {
    this.productos = this.productos.filter(
      (p) => p.productoId.toString() !== productoId.toString()
    );

    return await this.save();
  } catch (error) {
    throw error;
  }
};

// Método para actualizar producto en la wishlist
wishlistSchema.methods.actualizarProducto = async function (
  productoId,
  datosActualizados
) {
  try {
    const producto = this.productos.find(
      (p) => p.productoId.toString() === productoId.toString()
    );

    if (!producto) {
      throw new Error("Producto no encontrado en la wishlist");
    }

    Object.assign(producto, datosActualizados);

    return await this.save();
  } catch (error) {
    throw error;
  }
};

// Método para incrementar vistas
wishlistSchema.methods.incrementarVistas = function () {
  this.vistas += 1;
  this.ultimaVista = new Date();
  return this.save();
};

// Método para generar nuevo código de compartir
wishlistSchema.methods.generarNuevoCodigo = function () {
  this.compartir.codigo = this._id.toString().slice(-8).toUpperCase();
  this.compartir.usosActuales = 0;
  return this.save();
};

// Método para verificar si se puede compartir
wishlistSchema.methods.puedeCompartir = function () {
  if (!this.publica || !this.compartir.codigo) {
    return false;
  }

  if (
    this.compartir.fechaExpiracion &&
    this.compartir.fechaExpiracion < new Date()
  ) {
    return false;
  }

  if (
    this.compartir.maxUsos > 0 &&
    this.compartir.usosActuales >= this.compartir.maxUsos
  ) {
    return false;
  }

  return true;
};

// Método para incrementar uso del código de compartir
wishlistSchema.methods.incrementarUsoCompartir = function () {
  if (this.puedeCompartir()) {
    this.compartir.usosActuales += 1;
    return this.save();
  }
  throw new Error("No se puede usar este código de compartir");
};

// Método para calcular valor total
wishlistSchema.methods.calcularValorTotal = async function () {
  const Producto = mongoose.model("Producto");

  let valorTotal = 0;

  for (const item of this.productos) {
    const producto = await Producto.findById(item.productoId);
    if (producto) {
      valorTotal += producto.precioFinal * item.cantidad;
    }
  }

  return valorTotal;
};

// Método para obtener productos en oferta
wishlistSchema.methods.obtenerProductosEnOferta = async function () {
  const Producto = mongoose.model("Producto");

  const productosEnOferta = [];

  for (const item of this.productos) {
    const producto = await Producto.findById(item.productoId);
    if (producto && producto.enOferta) {
      productosEnOferta.push({
        item,
        producto,
      });
    }
  }

  return productosEnOferta;
};

module.exports = mongoose.model("Wishlist", wishlistSchema);

