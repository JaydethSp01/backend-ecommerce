const mongoose = require("mongoose");

const detallePedidoSchema = new mongoose.Schema({
  productoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Producto",
    required: true,
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1,
  },
  precioUnitario: {
    type: Number,
    required: true,
    min: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
});

const direccionEnvioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    maxlength: 100,
  },
  telefono: {
    type: String,
    required: true,
    maxlength: 20,
  },
  direccion: {
    type: String,
    required: true,
    maxlength: 200,
  },
  ciudad: {
    type: String,
    required: true,
    maxlength: 100,
  },
  codigoPostal: {
    type: String,
    required: true,
    maxlength: 20,
  },
  pais: {
    type: String,
    required: true,
    maxlength: 100,
    default: "Colombia",
  },
  coordenadas: {
    latitud: {
      type: Number,
      required: false,
    },
    longitud: {
      type: Number,
      required: false,
    },
  },
});

const informacionPagoSchema = new mongoose.Schema({
  metodo: {
    type: String,
    required: true,
    enum: ["credit_card", "debit_card", "paypal", "cash_on_delivery"],
  },
  numeroTarjeta: {
    type: String,
    required: false,
  },
  nombreTitular: {
    type: String,
    required: false,
    maxlength: 100,
  },
  fechaVencimiento: {
    type: String,
    required: false,
  },
  codigoSeguridad: {
    type: String,
    required: false,
  },
  transaccionId: {
    type: String,
    required: false,
  },
});

const pedidoSchema = new mongoose.Schema(
  {
    numeroPedido: {
      type: String,
      required: true,
      unique: true,
    },
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: false, // Permitir pedidos de invitados
    },
    detalles: [detallePedidoSchema],
    direccionEnvio: direccionEnvioSchema,
    informacionPago: informacionPagoSchema,
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    impuestos: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    costoEnvio: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    descuento: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    estado: {
      type: String,
      required: true,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    fechaPedido: {
      type: Date,
      default: Date.now,
    },
    fechaEstimadaEntrega: {
      type: Date,
      required: false,
    },
    fechaEntrega: {
      type: Date,
      required: false,
    },
    notas: {
      type: String,
      maxlength: 500,
    },
    trackingNumber: {
      type: String,
      required: false,
    },
    metodoEnvio: {
      type: String,
      enum: ["standard", "express", "overnight"],
      default: "standard",
    },
    puntosFidelidadUsados: {
      type: Number,
      default: 0,
      min: 0,
    },
    puntosFidelidadGanados: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para optimizar consultas
pedidoSchema.index({ numeroPedido: 1 });
pedidoSchema.index({ usuarioId: 1 });
pedidoSchema.index({ estado: 1 });
pedidoSchema.index({ fechaPedido: -1 });

// Método para generar número de pedido único
pedidoSchema.statics.generarNumeroPedido = function () {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `TK${timestamp}${random}`;
};

// Método para calcular totales
pedidoSchema.methods.calcularTotales = function () {
  this.subtotal = this.detalles.reduce(
    (total, detalle) => total + detalle.subtotal,
    0
  );
  this.impuestos = this.subtotal * 0.19; // IVA 19%
  this.total =
    this.subtotal + this.impuestos + this.costoEnvio - this.descuento;
  return this;
};

// Método para actualizar estado
pedidoSchema.methods.actualizarEstado = function (nuevoEstado, notas) {
  this.estado = nuevoEstado;
  if (notas) {
    this.notas = notas;
  }

  // Actualizar fechas según el estado
  switch (nuevoEstado) {
    case "confirmed":
      this.fechaEstimadaEntrega = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ); // 3 días
      break;
    case "delivered":
      this.fechaEntrega = new Date();
      break;
  }

  return this.save();
};

// Método para obtener pedidos por usuario
pedidoSchema.statics.obtenerPorUsuario = function (
  usuarioId,
  pagina = 1,
  limite = 10
) {
  const skip = (pagina - 1) * limite;

  return this.find({ usuarioId })
    .populate("detalles.productoId", "nombre precio imagen")
    .sort({ fechaPedido: -1 })
    .skip(skip)
    .limit(limite);
};

// Método para obtener estadísticas de pedidos
pedidoSchema.statics.obtenerEstadisticas = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalPedidos: { $sum: 1 },
        totalVentas: { $sum: "$total" },
        pedidosPendientes: {
          $sum: { $cond: [{ $eq: ["$estado", "pending"] }, 1, 0] },
        },
        pedidosConfirmados: {
          $sum: { $cond: [{ $eq: ["$estado", "confirmed"] }, 1, 0] },
        },
        pedidosEnviados: {
          $sum: { $cond: [{ $eq: ["$estado", "shipped"] }, 1, 0] },
        },
        pedidosEntregados: {
          $sum: { $cond: [{ $eq: ["$estado", "delivered"] }, 1, 0] },
        },
        pedidosCancelados: {
          $sum: { $cond: [{ $eq: ["$estado", "cancelled"] }, 1, 0] },
        },
      },
    },
  ]);
};

// Método para obtener productos más vendidos
pedidoSchema.statics.obtenerProductosMasVendidos = function (limite = 10) {
  return this.aggregate([
    { $unwind: "$detalles" },
    {
      $group: {
        _id: "$detalles.productoId",
        totalVendido: { $sum: "$detalles.cantidad" },
        totalIngresos: { $sum: "$detalles.subtotal" },
      },
    },
    {
      $lookup: {
        from: "productos",
        localField: "_id",
        foreignField: "_id",
        as: "producto",
      },
    },
    { $unwind: "$producto" },
    {
      $project: {
        productoId: "$_id",
        nombre: "$producto.nombre",
        marca: "$producto.marca",
        totalVendido: 1,
        totalIngresos: 1,
      },
    },
    { $sort: { totalVendido: -1 } },
    { $limit: limite },
  ]);
};

module.exports = mongoose.model("Pedido", pedidoSchema);


