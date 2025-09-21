const express = require("express");
const router = express.Router();
const Imagen = require("../models/Imagen");
const TipoProducto = require("../models/TipoProducto");
const Producto = require("../models/Producto");
const {
  verificarFirebaseAuth,
  verificarAdmin,
  autenticacionOpcional,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");
const multer = require("multer");
const path = require("path");

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Solo se permiten archivos de imagen (JPEG, JPG, PNG, GIF, WEBP)"
        )
      );
    }
  },
});

// Esquemas de validación
const esquemaImagen = Joi.object({
  nombre: Joi.string().required().max(200),
  descripcion: Joi.string().max(500),
  tipoProductoId: Joi.string().required(),
  productoId: Joi.string(),
  tipo: Joi.string()
    .valid("PRINCIPAL", "SECUNDARIA", "GALERIA", "MINIATURA")
    .default("GALERIA"),
  orden: Joi.number().default(0),
  alt: Joi.string().max(200),
  titulo: Joi.string().max(200),
  metadatos: Joi.object({
    ancho: Joi.number().min(1),
    alto: Joi.number().min(1),
    formato: Joi.string()
      .valid("JPEG", "PNG", "WEBP", "GIF", "SVG")
      .default("JPEG"),
    calidad: Joi.number().min(1).max(100).default(85),
  }),
});

// GET /api/imagenes - Obtener todas las imágenes
router.get("/", autenticacionOpcional, async (req, res, next) => {
  try {
    const {
      pagina = 1,
      limite = 20,
      tipoProductoId,
      productoId,
      tipo,
      activa = true,
    } = req.query;

    // Construir filtros
    const filtros = {};
    if (activa === "true") filtros.activa = true;
    if (tipoProductoId) filtros.tipoProductoId = tipoProductoId;
    if (productoId) filtros.productoId = productoId;
    if (tipo) filtros.tipo = tipo;

    // Calcular paginación
    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    // Ejecutar consulta
    const imagenes = await Imagen.find(filtros)
      .populate("tipoProductoId", "nombre descripcion")
      .populate("productoId", "nombre precio")
      .sort({ orden: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limite));

    const total = await Imagen.countDocuments(filtros);

    res.json({
      success: true,
      data: imagenes,
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

// GET /api/imagenes/tipo-producto/:tipoProductoId - Obtener imágenes por tipo de producto
router.get(
  "/tipo-producto/:tipoProductoId",
  autenticacionOpcional,
  async (req, res, next) => {
    try {
      const { tipoProductoId } = req.params;
      const { tipo } = req.query;

      const imagenes = await Imagen.obtenerPorTipoProducto(
        tipoProductoId,
        tipo
      );

      res.json({
        success: true,
        data: imagenes,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/imagenes/producto/:productoId - Obtener imágenes por producto
router.get(
  "/producto/:productoId",
  autenticacionOpcional,
  async (req, res, next) => {
    try {
      const { productoId } = req.params;
      const { tipo } = req.query;

      const imagenes = await Imagen.obtenerPorProducto(productoId, tipo);

      res.json({
        success: true,
        data: imagenes,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/imagenes/:id - Obtener imagen por ID
router.get("/:id", autenticacionOpcional, async (req, res, next) => {
  try {
    const imagen = await Imagen.findById(req.params.id)
      .populate("tipoProductoId", "nombre descripcion")
      .populate("productoId", "nombre precio");

    if (!imagen || !imagen.activa) {
      return res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
    }

    res.json({
      success: true,
      data: imagen,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/imagenes - Crear nueva imagen (Solo admin)
router.post(
  "/",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaImagen),
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

      // Verificar que el producto existe si se especifica
      if (req.body.productoId) {
        const producto = await Producto.findById(req.body.productoId);
        if (!producto) {
          return res.status(400).json({
            success: false,
            error: "Producto no encontrado",
          });
        }
      }

      const imagen = new Imagen(req.body);
      await imagen.save();

      res.status(201).json({
        success: true,
        data: imagen,
        message: "Imagen creada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/imagenes/upload - Subir archivo de imagen (Solo admin)
router.post(
  "/upload",
  verificarFirebaseAuth,
  verificarAdmin,
  upload.single("imagen"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No se ha subido ningún archivo",
        });
      }

      const {
        tipoProductoId,
        productoId,
        tipo = "GALERIA",
        orden = 0,
        alt,
        titulo,
      } = req.body;

      // Verificar que el tipo de producto existe
      const tipoProducto = await TipoProducto.findById(tipoProductoId);
      if (!tipoProducto) {
        return res.status(400).json({
          success: false,
          error: "Tipo de producto no encontrado",
        });
      }

      // Verificar que el producto existe si se especifica
      if (productoId) {
        const producto = await Producto.findById(productoId);
        if (!producto) {
          return res.status(400).json({
            success: false,
            error: "Producto no encontrado",
          });
        }
      }

      // Crear registro de imagen
      const imagen = new Imagen({
        url: `/uploads/${req.file.filename}`,
        nombre: req.file.originalname,
        tipoProductoId,
        productoId: productoId || null,
        tipo,
        orden: parseInt(orden),
        alt: alt || req.file.originalname,
        titulo: titulo || req.file.originalname,
        metadatos: {
          tamaño: req.file.size,
          formato: req.file.mimetype.split("/")[1].toUpperCase(),
          proveedor: "LOCAL",
        },
      });

      await imagen.save();

      res.status(201).json({
        success: true,
        data: imagen,
        message: "Imagen subida exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/imagenes/:id - Actualizar imagen (Solo admin)
router.put(
  "/:id",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaImagen),
  async (req, res, next) => {
    try {
      const imagen = await Imagen.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      })
        .populate("tipoProductoId", "nombre descripcion")
        .populate("productoId", "nombre precio");

      if (!imagen) {
        return res.status(404).json({
          success: false,
          error: "Imagen no encontrada",
        });
      }

      res.json({
        success: true,
        data: imagen,
        message: "Imagen actualizada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/imagenes/:id - Eliminar imagen (Solo admin)
router.delete(
  "/:id",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const imagen = await Imagen.findByIdAndUpdate(
        req.params.id,
        { activa: false },
        { new: true }
      );

      if (!imagen) {
        return res.status(404).json({
          success: false,
          error: "Imagen no encontrada",
        });
      }

      res.json({
        success: true,
        message: "Imagen eliminada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/imagenes/:id/principal - Marcar imagen como principal (Solo admin)
router.put(
  "/:id/principal",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const imagen = await Imagen.findById(req.params.id);

      if (!imagen) {
        return res.status(404).json({
          success: false,
          error: "Imagen no encontrada",
        });
      }

      await imagen.marcarComoPrincipal();

      res.json({
        success: true,
        data: imagen,
        message: "Imagen marcada como principal exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/imagenes/:id/orden - Actualizar orden de imagen (Solo admin)
router.put(
  "/:id/orden",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { orden } = req.body;

      if (typeof orden !== "number") {
        return res.status(400).json({
          success: false,
          error: "El orden debe ser un número",
        });
      }

      const imagen = await Imagen.findByIdAndUpdate(
        req.params.id,
        { orden },
        { new: true }
      );

      if (!imagen) {
        return res.status(404).json({
          success: false,
          error: "Imagen no encontrada",
        });
      }

      res.json({
        success: true,
        data: imagen,
        message: "Orden actualizado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/imagenes/:id/optimizar - Generar URLs optimizadas (Solo admin)
router.put(
  "/:id/optimizar",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const imagen = await Imagen.findById(req.params.id);

      if (!imagen) {
        return res.status(404).json({
          success: false,
          error: "Imagen no encontrada",
        });
      }

      await imagen.generarUrlsOptimizadas();

      res.json({
        success: true,
        data: imagen,
        message: "URLs optimizadas generadas exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/imagenes/:id/urls - Obtener URLs de imagen
router.get("/:id/urls", autenticacionOpcional, async (req, res, next) => {
  try {
    const imagen = await Imagen.findById(req.params.id);

    if (!imagen || !imagen.activa) {
      return res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
    }

    res.json({
      success: true,
      data: {
        original: imagen.urlCompleta,
        optimizada: imagen.urlOptimizadaCompleta,
        thumbnail: imagen.urlThumbnailCompleta,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

