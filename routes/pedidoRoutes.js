const express = require("express");
const router = express.Router();
const Pedido = require("../models/Pedido");
const Producto = require("../models/Producto");
const Usuario = require("../models/Usuario");
const {
  verificarFirebaseAuth,
  verificarAdmin,
  autenticacionOpcional,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");

// Esquemas de validación
const esquemaDetallePedido = Joi.object({
  productoId: Joi.alternatives()
    .try(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // MongoDB ObjectId
      Joi.string().min(1) // String ID
    )
    .required(),
  cantidad: Joi.number().integer().min(1).required(),
  precioUnitario: Joi.number().min(0).required(),
  subtotal: Joi.number().min(0).required(),
});

const esquemaDireccionEnvio = Joi.object({
  nombre: Joi.string().required().max(100),
  email: Joi.string().email().required().max(100),
  telefono: Joi.string().required().max(20),
  direccion: Joi.string().required().max(200),
  ciudad: Joi.string().required().max(100),
  codigoPostal: Joi.string().required().max(20),
  pais: Joi.string().max(100).default("Colombia"),
  coordenadas: Joi.object({
    latitud: Joi.number(),
    longitud: Joi.number(),
  }).optional(),
});

const esquemaInformacionPago = Joi.object({
  metodo: Joi.string()
    .valid("credit_card", "debit_card", "paypal", "cash_on_delivery")
    .required(),
  numeroTarjeta: Joi.string().when("metodo", {
    is: Joi.string().valid("credit_card", "debit_card"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  nombreTitular: Joi.string().max(100),
  fechaVencimiento: Joi.string(),
  codigoSeguridad: Joi.string(),
  transaccionId: Joi.string(),
});

const esquemaCrearPedido = Joi.object({
  numeroPedido: Joi.string().optional(),
  detalles: Joi.array().items(esquemaDetallePedido).min(1).required(),
  direccionEnvio: esquemaDireccionEnvio.required(),
  informacionPago: esquemaInformacionPago.required(),
  subtotal: Joi.number().min(0).required(),
  impuestos: Joi.number().min(0).required(),
  costoEnvio: Joi.number().min(0).default(0),
  descuento: Joi.number().min(0).default(0),
  total: Joi.number().min(0).required(),
  estado: Joi.string()
    .valid(
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded"
    )
    .default("pending"),
  puntosFidelidadUsados: Joi.number().min(0).default(0),
  puntosFidelidadGanados: Joi.number().min(0).default(0),
  notas: Joi.string().max(500),
  metodoEnvio: Joi.string()
    .valid("standard", "express", "overnight")
    .default("standard"),
  usuarioId: Joi.alternatives()
    .try(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // MongoDB ObjectId
      Joi.string().min(1) // String ID
    )
    .optional(),
});

const esquemaActualizarEstado = Joi.object({
  estado: Joi.string()
    .valid(
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded"
    )
    .required(),
  notas: Joi.string().max(500),
  trackingNumber: Joi.string(),
});

// GET /api/pedidos - Obtener pedidos del usuario autenticado
router.get("/", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const { pagina = 1, limite = 10, estado } = req.query;
    const usuarioId = req.usuario.uid;

    const filtros = { usuarioId };
    if (estado) filtros.estado = estado;

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const pedidos = await Pedido.find(filtros)
      .populate("detalles.productoId", "nombre precio imagen marca")
      .sort({ fechaPedido: -1 })
      .skip(skip)
      .limit(parseInt(limite));

    const total = await Pedido.countDocuments(filtros);

    res.json({
      success: true,
      data: pedidos,
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

// GET /api/pedidos/guest - Obtener pedidos de invitado por email
router.get("/guest", async (req, res, next) => {
  try {
    const { email, numeroPedido } = req.query;

    if (!email && !numeroPedido) {
      return res.status(400).json({
        success: false,
        error: "Se requiere email o número de pedido",
      });
    }

    const filtros = {};
    if (email) filtros["direccionEnvio.email"] = email;
    if (numeroPedido) filtros.numeroPedido = numeroPedido;

    const pedidos = await Pedido.find(filtros)
      .populate("detalles.productoId", "nombre precio imagen marca")
      .sort({ fechaPedido: -1 })
      .limit(10);

    res.json({
      success: true,
      data: pedidos,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/pedidos/:id - Obtener pedido por ID
router.get("/:id", autenticacionOpcional, async (req, res, next) => {
  try {
    const pedido = await Pedido.findById(req.params.id).populate(
      "detalles.productoId",
      "nombre precio imagen marca"
    );

    if (!pedido) {
      return res.status(404).json({
        success: false,
        error: "Pedido no encontrado",
      });
    }

    // Verificar que el usuario tenga acceso al pedido
    if (req.usuario && pedido.usuarioId !== req.usuario.uid) {
      return res.status(403).json({
        success: false,
        error: "No tienes acceso a este pedido",
      });
    }

    res.json({
      success: true,
      data: pedido,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/pedidos - Crear nuevo pedido
router.post(
  "/",
  autenticacionOpcional,
  validarDatos(esquemaCrearPedido),
  async (req, res, next) => {
    try {
      const {
        numeroPedido,
        detalles,
        direccionEnvio,
        informacionPago,
        subtotal,
        impuestos,
        costoEnvio = 0,
        descuento = 0,
        total,
        estado = "pending",
        puntosFidelidadUsados = 0,
        puntosFidelidadGanados = 0,
        notas,
        metodoEnvio = "standard",
        usuarioId,
      } = req.body;

      // Verificar que todos los productos existen y tienen stock
      for (const detalle of detalles) {
        const producto = await Producto.findById(detalle.productoId);
        if (!producto || !producto.activo) {
          return res.status(400).json({
            success: false,
            error: `Producto ${detalle.productoId} no encontrado o inactivo`,
          });
        }

        if (producto.stock < detalle.cantidad) {
          return res.status(400).json({
            success: false,
            error: `Stock insuficiente para el producto ${producto.nombre}`,
          });
        }
      }

      // Crear el pedido
      const pedido = new Pedido({
        numeroPedido: numeroPedido || Pedido.generarNumeroPedido(),
        usuarioId: usuarioId || (req.usuario ? req.usuario.uid : null),
        detalles,
        direccionEnvio,
        informacionPago,
        subtotal,
        impuestos,
        costoEnvio,
        descuento,
        total,
        estado,
        puntosFidelidadUsados,
        puntosFidelidadGanados,
        notas,
        metodoEnvio,
      });

      // Guardar el pedido
      await pedido.save();

      // Actualizar stock de productos
      for (const detalle of detalles) {
        await Producto.findByIdAndUpdate(detalle.productoId, {
          $inc: { stock: -detalle.cantidad },
        });
      }

      // Actualizar puntos de fidelidad del usuario si está autenticado
      if (req.usuario && puntosFidelidadUsados > 0) {
        await Usuario.findOneAndUpdate(
          { firebaseUid: req.usuario.uid },
          { $inc: { puntosFidelidad: -puntosFidelidadUsados } }
        );
      }

      // Cargar el pedido con los productos poblados
      const pedidoCompleto = await Pedido.findById(pedido._id).populate(
        "detalles.productoId",
        "nombre precio imagen marca"
      );

      res.status(201).json({
        success: true,
        data: pedidoCompleto,
        message: "Pedido creado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/pedidos/:id/estado - Actualizar estado del pedido (Solo admin)
router.put(
  "/:id/estado",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaActualizarEstado),
  async (req, res, next) => {
    try {
      const { estado, notas, trackingNumber } = req.body;

      const pedido = await Pedido.findById(req.params.id);
      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: "Pedido no encontrado",
        });
      }

      // Actualizar estado
      await pedido.actualizarEstado(estado, notas);

      // Actualizar tracking number si se proporciona
      if (trackingNumber) {
        pedido.trackingNumber = trackingNumber;
        await pedido.save();
      }

      // Cargar el pedido actualizado
      const pedidoActualizado = await Pedido.findById(pedido._id).populate(
        "detalles.productoId",
        "nombre precio imagen marca"
      );

      res.json({
        success: true,
        data: pedidoActualizado,
        message: `Estado del pedido actualizado a ${estado}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/pedidos/admin/estadisticas - Obtener estadísticas de pedidos (Solo admin)
router.get(
  "/admin/estadisticas",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { fechaInicio, fechaFin } = req.query;

      const filtros = {};
      if (fechaInicio && fechaFin) {
        filtros.fechaPedido = {
          $gte: new Date(fechaInicio),
          $lte: new Date(fechaFin),
        };
      }

      const estadisticas = await Pedido.aggregate([
        { $match: filtros },
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
            ventasPromedio: { $avg: "$total" },
          },
        },
      ]);

      const productosMasVendidos = await Pedido.obtenerProductosMasVendidos(10);

      res.json({
        success: true,
        data: {
          estadisticas: estadisticas[0] || {
            totalPedidos: 0,
            totalVentas: 0,
            pedidosPendientes: 0,
            pedidosConfirmados: 0,
            pedidosEnviados: 0,
            pedidosEntregados: 0,
            pedidosCancelados: 0,
            ventasPromedio: 0,
          },
          productosMasVendidos,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/pedidos/admin/todos - Obtener todos los pedidos (Solo admin)
router.get(
  "/admin/todos",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const {
        pagina = 1,
        limite = 20,
        estado,
        fechaInicio,
        fechaFin,
        busqueda,
      } = req.query;

      const filtros = {};
      if (estado) filtros.estado = estado;
      if (fechaInicio && fechaFin) {
        filtros.fechaPedido = {
          $gte: new Date(fechaInicio),
          $lte: new Date(fechaFin),
        };
      }
      if (busqueda) {
        filtros.$or = [
          { numeroPedido: new RegExp(busqueda, "i") },
          { "direccionEnvio.nombre": new RegExp(busqueda, "i") },
          { "direccionEnvio.email": new RegExp(busqueda, "i") },
        ];
      }

      const skip = (parseInt(pagina) - 1) * parseInt(limite);

      const pedidos = await Pedido.find(filtros)
        .populate("detalles.productoId", "nombre precio imagen marca")
        .populate("usuarioId", "nombre email")
        .sort({ fechaPedido: -1 })
        .skip(skip)
        .limit(parseInt(limite));

      const total = await Pedido.countDocuments(filtros);

      res.json({
        success: true,
        data: pedidos,
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

// DELETE /api/pedidos/:id - Cancelar pedido
router.delete("/:id", verificarFirebaseAuth, async (req, res, next) => {
  try {
    const pedido = await Pedido.findById(req.params.id);

    if (!pedido) {
      return res.status(404).json({
        success: false,
        error: "Pedido no encontrado",
      });
    }

    // Verificar que el usuario tenga acceso al pedido
    if (pedido.usuarioId !== req.usuario.uid) {
      return res.status(403).json({
        success: false,
        error: "No tienes acceso a este pedido",
      });
    }

    // Solo permitir cancelar pedidos pendientes o confirmados
    if (!["pending", "confirmed"].includes(pedido.estado)) {
      return res.status(400).json({
        success: false,
        error: "No se puede cancelar un pedido en este estado",
      });
    }

    // Actualizar estado a cancelado
    await pedido.actualizarEstado(
      "cancelled",
      "Pedido cancelado por el usuario"
    );

    // Restaurar stock de productos
    for (const detalle of pedido.detalles) {
      await Producto.findByIdAndUpdate(detalle.productoId, {
        $inc: { stock: detalle.cantidad },
      });
    }

    // Restaurar puntos de fidelidad si se usaron
    if (pedido.puntosFidelidadUsados > 0) {
      await Usuario.findOneAndUpdate(
        { firebaseUid: req.usuario.uid },
        { $inc: { puntosFidelidad: pedido.puntosFidelidadUsados } }
      );
    }

    res.json({
      success: true,
      message: "Pedido cancelado exitosamente",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
