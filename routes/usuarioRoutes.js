const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");
const {
  verificarFirebaseAuth,
  verificarAdmin,
  verificarPropietario,
  autenticacionOpcional,
} = require("../middleware/authMiddleware");
const { validarDatos } = require("../middleware/authMiddleware");
const Joi = require("joi");

// Esquemas de validación
const esquemaUsuario = Joi.object({
  nombre: Joi.string().required().max(100),
  email: Joi.string().email().required(),
  telefono: Joi.string().max(20),
  direccion: Joi.string().max(200),
  rol: Joi.string().valid("CLIENTE", "ADMIN").default("CLIENTE"),
  activo: Joi.boolean().default(true),
  ubicacion: Joi.object({
    latitud: Joi.number().min(-90).max(90),
    longitud: Joi.number().min(-180).max(180),
    direccionCompleta: Joi.string(),
    ciudad: Joi.string(),
    pais: Joi.string(),
  }),
  idioma: Joi.string().valid("es", "en", "fr", "pt").default("es"),
});

const esquemaActualizacionUsuario = Joi.object({
  nombre: Joi.string().max(100),
  telefono: Joi.string().max(20),
  direccion: Joi.string().max(200),
  ubicacion: Joi.object({
    latitud: Joi.number().min(-90).max(90),
    longitud: Joi.number().min(-180).max(180),
    direccionCompleta: Joi.string(),
    ciudad: Joi.string(),
    pais: Joi.string(),
  }),
  idioma: Joi.string().valid("es", "en", "fr", "pt"),
});

// GET /api/usuarios - Obtener todos los usuarios (Solo admin)
router.get(
  "/",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const {
        pagina = 1,
        limite = 20,
        rol,
        activo,
        busqueda,
        ordenar = "createdAt",
        direccion = "desc",
      } = req.query;

      // Construir filtros
      const filtros = {};

      if (rol) filtros.rol = rol;
      if (activo !== undefined) filtros.activo = activo === "true";
      if (busqueda) {
        filtros.$or = [
          { nombre: new RegExp(busqueda, "i") },
          { email: new RegExp(busqueda, "i") },
        ];
      }

      // Configurar ordenamiento
      const ordenamiento = {};
      ordenamiento[ordenar] = direccion === "asc" ? 1 : -1;

      // Calcular paginación
      const skip = (parseInt(pagina) - 1) * parseInt(limite);

      // Ejecutar consulta
      const usuarios = await Usuario.find(filtros)
        .select("-password")
        .sort(ordenamiento)
        .skip(skip)
        .limit(parseInt(limite));

      const total = await Usuario.countDocuments(filtros);

      res.json({
        success: true,
        data: usuarios,
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

// GET /api/usuarios/estadisticas - Obtener estadísticas de usuarios (Solo admin)
router.get(
  "/estadisticas",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const estadisticas = await Usuario.aggregate([
        {
          $group: {
            _id: null,
            totalUsuarios: { $sum: 1 },
            usuariosActivos: {
              $sum: { $cond: [{ $eq: ["$activo", true] }, 1, 0] },
            },
            usuariosInactivos: {
              $sum: { $cond: [{ $eq: ["$activo", false] }, 1, 0] },
            },
            admins: {
              $sum: { $cond: [{ $eq: ["$rol", "ADMIN"] }, 1, 0] },
            },
            clientes: {
              $sum: { $cond: [{ $eq: ["$rol", "CLIENTE"] }, 1, 0] },
            },
          },
        },
      ]);

      // Obtener usuarios nuevos del mes
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const nuevosUsuariosMes = await Usuario.countDocuments({
        fechaRegistro: { $gte: inicioMes },
      });

      const resultado = estadisticas[0] || {
        totalUsuarios: 0,
        usuariosActivos: 0,
        usuariosInactivos: 0,
        admins: 0,
        clientes: 0,
      };

      resultado.nuevosUsuariosMes = nuevosUsuariosMes;

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/usuarios/:id - Obtener usuario por ID
router.get(
  "/:id",
  verificarFirebaseAuth,
  verificarPropietario,
  async (req, res, next) => {
    try {
      const usuario = await Usuario.findById(req.params.id).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/usuarios/perfil/mi-perfil - Obtener perfil del usuario autenticado
router.get(
  "/perfil/mi-perfil",
  verificarFirebaseAuth,
  async (req, res, next) => {
    try {
      const usuario = await Usuario.findById(req.usuario._id).select(
        "-password"
      );

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/usuarios - Crear nuevo usuario (Solo admin)
router.post(
  "/",
  verificarFirebaseAuth,
  verificarAdmin,
  validarDatos(esquemaUsuario),
  async (req, res, next) => {
    try {
      // Verificar si el email ya existe
      const emailExistente = await Usuario.existeEmail(req.body.email);
      if (emailExistente) {
        return res.status(400).json({
          success: false,
          error: "El email ya está registrado",
        });
      }

      const usuario = new Usuario(req.body);
      await usuario.save();

      res.status(201).json({
        success: true,
        data: usuario.toPublicJSON(),
        message: "Usuario creado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/usuarios/:id - Actualizar usuario
router.put(
  "/:id",
  verificarFirebaseAuth,
  verificarPropietario,
  validarDatos(esquemaActualizacionUsuario),
  async (req, res, next) => {
    try {
      const usuario = await Usuario.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
        message: "Usuario actualizado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/usuarios/perfil/actualizar - Actualizar perfil del usuario autenticado
router.put(
  "/perfil/actualizar",
  verificarFirebaseAuth,
  validarDatos(esquemaActualizacionUsuario),
  async (req, res, next) => {
    try {
      const usuario = await Usuario.findByIdAndUpdate(
        req.usuario._id,
        req.body,
        { new: true, runValidators: true }
      ).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
        message: "Perfil actualizado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/usuarios/:id - Eliminar usuario (Solo admin)
router.delete(
  "/:id",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const usuario = await Usuario.findByIdAndUpdate(
        req.params.id,
        { activo: false },
        { new: true }
      ).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        message: "Usuario desactivado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/usuarios/:id/activar - Activar/desactivar usuario (Solo admin)
router.put(
  "/:id/activar",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { activo } = req.body;
      const usuario = await Usuario.findByIdAndUpdate(
        req.params.id,
        { activo },
        { new: true }
      ).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
        message: `Usuario ${activo ? "activado" : "desactivado"} exitosamente`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/usuarios/:id/rol - Cambiar rol de usuario (Solo admin)
router.put(
  "/:id/rol",
  verificarFirebaseAuth,
  verificarAdmin,
  async (req, res, next) => {
    try {
      const { rol } = req.body;

      if (!["CLIENTE", "ADMIN"].includes(rol)) {
        return res.status(400).json({
          success: false,
          error: "Rol inválido. Debe ser CLIENTE o ADMIN",
        });
      }

      const usuario = await Usuario.findByIdAndUpdate(
        req.params.id,
        { rol },
        { new: true }
      ).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
        message: `Rol actualizado a ${rol} exitosamente`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/usuarios/:id/ubicacion - Actualizar ubicación del usuario
router.put(
  "/:id/ubicacion",
  verificarFirebaseAuth,
  verificarPropietario,
  async (req, res, next) => {
    try {
      const { ubicacion } = req.body;

      const usuario = await Usuario.findByIdAndUpdate(
        req.params.id,
        { ubicacion },
        { new: true }
      ).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
        message: "Ubicación actualizada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/usuarios/:id/idioma - Cambiar idioma del usuario
router.put(
  "/:id/idioma",
  verificarFirebaseAuth,
  verificarPropietario,
  async (req, res, next) => {
    try {
      const { idioma } = req.body;

      if (!["es", "en", "fr", "pt"].includes(idioma)) {
        return res.status(400).json({
          success: false,
          error: "Idioma inválido",
        });
      }

      const usuario = await Usuario.findByIdAndUpdate(
        req.params.id,
        { idioma },
        { new: true }
      ).select("-password");

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      res.json({
        success: true,
        data: usuario,
        message: `Idioma actualizado a ${idioma} exitosamente`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/usuarios/:id/actividad - Obtener actividad del usuario (Solo admin o propio usuario)
router.get(
  "/:id/actividad",
  verificarFirebaseAuth,
  verificarPropietario,
  async (req, res, next) => {
    try {
      const { limite = 20 } = req.query;

      // Aquí se pueden agregar consultas a logs de actividad, favoritos, wishlists, etc.
      const actividad = {
        ultimoLogin: req.usuario.ultimoLogin,
        fechaRegistro: req.usuario.fechaRegistro,
        // Se pueden agregar más actividades según sea necesario
      };

      res.json({
        success: true,
        data: actividad,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

