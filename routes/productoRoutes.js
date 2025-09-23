const express = require("express");
const router = express.Router();
const cors = require("cors");
const Producto = require("../models/Producto");
const TipoProducto = require("../models/TipoProducto");
const {
  verificarFirebaseAuth,
  verificarAdmin,
  autenticacionOpcional,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");

// CORS específico para rutas de productos
router.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  })
);

// Manejar preflight requests para todas las rutas
router.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

// Endpoint simple sin middleware para probar
router.get("/test", async (req, res) => {
  res.json({
    message: "API funcionando",
    timestamp: new Date().toISOString(),
    cors: "CORS habilitado",
    rateLimit: "Rate limiting configurado",
  });
});

// Endpoint simple para obtener productos sin autenticación
router.get("/simple", async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true })
      .select("nombre precio marca imagenPrincipal")
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: productos,
      count: productos.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: error.message,
    });
  }
});

// Esquemas de validación
const esquemaProducto = Joi.object({
  nombre: Joi.string().required().max(200),
  descripcion: Joi.string().required().max(1000),
  precio: Joi.number().required().min(0),
  stock: Joi.number().min(0).default(0),
  tipoProductoId: Joi.string().required(),
  marca: Joi.string().max(100),
  modelo: Joi.string().max(100),
  tallas: Joi.array().items(Joi.string()),
  colores: Joi.array().items(Joi.string()),
  material: Joi.string().max(100),
  genero: Joi.string()
    .valid("HOMBRE", "MUJER", "UNISEX", "NIÑO", "NIÑA")
    .default("UNISEX"),
  edad: Joi.string().valid("ADULTO", "NIÑO", "BEBE").default("ADULTO"),
  temporada: Joi.string()
    .valid("PRIMAVERA", "VERANO", "OTOÑO", "INVIERNO", "TODO_EL_AÑO")
    .default("TODO_EL_AÑO"),
  destacado: Joi.boolean().default(false),
  oferta: Joi.object({
    activa: Joi.boolean().default(false),
    descuento: Joi.number().min(0).max(100).default(0),
    precioOferta: Joi.number().min(0),
    fechaInicio: Joi.date(),
    fechaFin: Joi.date(),
  }),
  metaDescripcion: Joi.string().max(160),
  palabrasClave: Joi.array().items(Joi.string()),
});

// GET /api/producto - Obtener todos los productos
router.get("/", async (req, res, next) => {
  try {
    // Agregar headers CORS explícitos
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    );

    const {
      pagina = 1,
      limite = 20,
      tipoProductoId,
      genero,
      marca,
      precioMin,
      precioMax,
      destacado,
      oferta,
      busqueda,
      ordenar = "createdAt",
      direccion = "desc",
    } = req.query;

    // Construir filtros
    const filtros = { activo: true };

    if (tipoProductoId) filtros.tipoProductoId = tipoProductoId;
    if (genero) filtros.genero = genero;
    if (marca) filtros.marca = new RegExp(marca, "i");
    if (precioMin || precioMax) {
      filtros.precio = {};
      if (precioMin) filtros.precio.$gte = parseFloat(precioMin);
      if (precioMax) filtros.precio.$lte = parseFloat(precioMax);
    }
    if (destacado === "true") filtros.destacado = true;
    if (oferta === "true") filtros["oferta.activa"] = true;

    // Búsqueda por texto
    if (busqueda) {
      filtros.$or = [
        { nombre: new RegExp(busqueda, "i") },
        { descripcion: new RegExp(busqueda, "i") },
        { marca: new RegExp(busqueda, "i") },
      ];
    }

    // Configurar ordenamiento
    const ordenamiento = {};
    ordenamiento[ordenar] = direccion === "asc" ? 1 : -1;

    // Calcular paginación
    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    // Ejecutar consulta
    const productos = await Producto.find(filtros)
      .populate("tipoProductoId", "nombre descripcion")
      .sort(ordenamiento)
      .skip(skip)
      .limit(parseInt(limite));

    const total = await Producto.countDocuments(filtros);

    res.json({
      success: true,
      data: productos,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / parseInt(limite)),
      },
      cors: "CORS habilitado",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en GET /api/producto:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/producto/:id - Obtener producto por ID
router.get("/:id", autenticacionOpcional, async (req, res, next) => {
  try {
    const producto = await Producto.findById(req.params.id).populate(
      "tipoProductoId",
      "nombre descripcion"
    );

    if (!producto || !producto.activo) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
      });
    }

    // Incrementar vistas si el usuario está autenticado
    if (req.usuario) {
      await producto.incrementarVistas();
    }

    res.json({
      success: true,
      data: producto,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/producto/tipo/:tipoProductoId - Obtener productos por tipo
router.get(
  "/tipo/:tipoProductoId",
  autenticacionOpcional,
  async (req, res, next) => {
    try {
      const { tipoProductoId } = req.params;
      const { pagina = 1, limite = 20 } = req.query;

      const skip = (parseInt(pagina) - 1) * parseInt(limite);

      const productos = await Producto.find({
        tipoProductoId,
        activo: true,
      })
        .populate("tipoProductoId", "nombre descripcion")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limite));

      const total = await Producto.countDocuments({
        tipoProductoId,
        activo: true,
      });

      res.json({
        success: true,
        data: productos,
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

// GET /api/producto/buscar/:texto - Búsqueda de productos
router.get("/buscar/:texto", autenticacionOpcional, async (req, res, next) => {
  try {
    const { texto } = req.params;
    const { idioma = "es", limite = 20 } = req.query;

    const productos = await Producto.buscarPorTexto(texto, idioma).limit(
      parseInt(limite)
    );

    res.json({
      success: true,
      data: productos,
      busqueda: texto,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/producto/destacados - Obtener productos destacados
router.get("/destacados", autenticacionOpcional, async (req, res, next) => {
  try {
    const { limite = 10 } = req.query;
    const productos = await Producto.obtenerDestacados(parseInt(limite));

    res.json({
      success: true,
      data: productos,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/producto/ofertas - Obtener productos en oferta
router.get("/ofertas", autenticacionOpcional, async (req, res, next) => {
  try {
    const { limite = 10 } = req.query;
    const productos = await Producto.obtenerEnOferta(parseInt(limite));

    res.json({
      success: true,
      data: productos,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/producto - Crear nuevo producto (Solo admin)
router.post(
  "/",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaProducto),
  async (req, res, next) => {
    try {
      // Verificar que el tipo de producto existe
      const tipoProducto = await TipoProducto.findById(req.body.tipoProductoId);
      if (!tipoProducto) {
        return res.status(400).json({
          success: false,
          error: "Tipo de producto no encontrado",
        });
      }

      const producto = new Producto(req.body);
      await producto.save();

      // Actualizar contador de productos en el tipo
      await tipoProducto.actualizarContadorProductos();

      res.status(201).json({
        success: true,
        data: producto,
        message: "Producto creado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/producto/:id - Actualizar producto (Solo admin)
router.put(
  "/:id",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaProducto),
  async (req, res, next) => {
    try {
      const producto = await Producto.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate("tipoProductoId", "nombre descripcion");

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: "Producto no encontrado",
        });
      }

      res.json({
        success: true,
        data: producto,
        message: "Producto actualizado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/producto/:id - Eliminar producto (Solo admin)
router.delete(
  "/:id",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const producto = await Producto.findByIdAndUpdate(
        req.params.id,
        { activo: false },
        { new: true }
      );

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: "Producto no encontrado",
        });
      }

      // Actualizar contador de productos en el tipo
      const tipoProducto = await TipoProducto.findById(producto.tipoProductoId);
      if (tipoProducto) {
        await tipoProducto.actualizarContadorProductos();
      }

      res.json({
        success: true,
        message: "Producto eliminado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/producto/:id/destacar - Marcar/desmarcar como destacado (Solo admin)
router.put(
  "/:id/destacar",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { destacado } = req.body;
      const producto = await Producto.findByIdAndUpdate(
        req.params.id,
        { destacado },
        { new: true }
      ).populate("tipoProductoId", "nombre descripcion");

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: "Producto no encontrado",
        });
      }

      res.json({
        success: true,
        data: producto,
        message: `Producto ${
          destacado ? "marcado" : "desmarcado"
        } como destacado`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/producto/:id/oferta - Configurar oferta (Solo admin)
router.put(
  "/:id/oferta",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { oferta } = req.body;
      const producto = await Producto.findByIdAndUpdate(
        req.params.id,
        { oferta },
        { new: true }
      ).populate("tipoProductoId", "nombre descripcion");

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: "Producto no encontrado",
        });
      }

      res.json({
        success: true,
        data: producto,
        message: "Oferta configurada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/producto/:id/stock - Actualizar stock (Solo admin)
router.put(
  "/:id/stock",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { stock } = req.body;

      if (typeof stock !== "number" || stock < 0) {
        return res.status(400).json({
          success: false,
          error: "El stock debe ser un número mayor o igual a 0",
        });
      }

      const producto = await Producto.findByIdAndUpdate(
        req.params.id,
        { stock },
        { new: true }
      ).populate("tipoProductoId", "nombre descripcion");

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: "Producto no encontrado",
        });
      }

      res.json({
        success: true,
        data: producto,
        message: "Stock actualizado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

