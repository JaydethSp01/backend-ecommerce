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
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Esquemas de validación
const esquemaLogin = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required().min(6),
});

const esquemaRegistro = Joi.object({
  nombre: Joi.string().required().max(100),
  email: Joi.string().email().required(),
  password: Joi.string().required().min(6),
  telefono: Joi.string().allow("").max(20),
  direccion: Joi.string().allow("").max(200),
  rol: Joi.string().valid("CLIENTE", "ADMIN").default("CLIENTE"),
});

const esquemaUsuario = Joi.object({
  nombre: Joi.string().required().max(100),
  email: Joi.string().email().required(),
  telefono: Joi.string().allow("").max(20),
  direccion: Joi.string().allow("").max(200),
  rol: Joi.string().valid("CLIENTE", "ADMIN").default("CLIENTE"),
  activo: Joi.boolean().default(true),
  ubicacion: Joi.object({
    latitud: Joi.number().min(-90).max(90).allow(null),
    longitud: Joi.number().min(-180).max(180).allow(null),
    direccionCompleta: Joi.string().allow(""),
    ciudad: Joi.string().allow(""),
    pais: Joi.string().allow(""),
  }).allow(null),
  idioma: Joi.string().valid("es", "en", "fr", "pt").default("es"),
});

const esquemaActualizacionUsuario = Joi.object({
  nombre: Joi.string().allow("").max(100),
  telefono: Joi.string().allow("").max(20),
  direccion: Joi.string().allow("").max(200),
  ubicacion: Joi.object({
    latitud: Joi.number().min(-90).max(90).allow(null),
    longitud: Joi.number().min(-180).max(180).allow(null),
    direccionCompleta: Joi.string().allow(""),
    ciudad: Joi.string().allow(""),
    pais: Joi.string().allow(""),
  }).allow(null),
  idioma: Joi.string().valid("es", "en", "fr", "pt").allow(""),
});

const esquemaSyncFirebase = Joi.object({
  firebaseUid: Joi.string().required(),
  email: Joi.string().email().required(),
  displayName: Joi.string().allow("").max(100),
  photoURL: Joi.string().allow("").uri(),
});

// POST /api/usuarios/login - Login de usuario
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario por email
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: "Credenciales inválidas",
      });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        error: "Credenciales inválidas",
      });
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        error: "Usuario desactivado",
      });
    }

    // Generar JWT token
    const token = jwt.sign(
      {
        userId: usuario._id,
        email: usuario.email,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET || "tekashi_secret_key",
      { expiresIn: "24h" }
    );

    // Actualizar último login
    usuario.ultimoLogin = new Date();
    await usuario.save();

    res.json({
      success: true,
      usuario: usuario.toPublicJSON(),
      token,
      message: "Login exitoso",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/usuarios/registro - Registro de usuario
router.post(
  "/registro",
  validarDatos(esquemaRegistro),
  async (req, res, next) => {
    try {
      const { nombre, email, password, telefono, direccion, rol } = req.body;

      // Verificar si el email ya existe
      const emailExistente = await Usuario.findOne({ email });
      if (emailExistente) {
        return res.status(400).json({
          success: false,
          error: "El email ya está registrado",
        });
      }

      // Crear nuevo usuario (el middleware se encarga de encriptar la contraseña)
      const nuevoUsuario = new Usuario({
        nombre,
        email,
        password, // El middleware pre('save') se encarga de encriptar
        telefono: telefono || "",
        direccion: direccion || "",
        rol: rol || "CLIENTE",
        activo: true,
        fechaRegistro: new Date(),
        ultimoLogin: new Date(),
      });

      await nuevoUsuario.save();

      // Generar JWT token
      const token = jwt.sign(
        {
          userId: nuevoUsuario._id,
          email: nuevoUsuario.email,
          rol: nuevoUsuario.rol,
        },
        process.env.JWT_SECRET || "tekashi_secret_key",
        { expiresIn: "24h" }
      );

      res.status(201).json({
        success: true,
        usuario: nuevoUsuario.toPublicJSON(),
        token,
        message: "Usuario registrado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
);

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

// POST /api/usuarios/sync-firebase - Sincronizar usuario de Firebase con la base de datos local
router.post(
  "/sync-firebase",
  validarDatos(esquemaSyncFirebase),
  async (req, res, next) => {
    try {
      const { firebaseUid, email, displayName, photoURL } = req.body;

      if (!firebaseUid || !email) {
        return res.status(400).json({
          success: false,
          error: "firebaseUid y email son requeridos",
        });
      }

      // Verificar si el usuario ya existe
      let usuario = await Usuario.findOne({
        $or: [{ firebaseUid: firebaseUid }, { email: email }],
      });

      if (usuario) {
        // Actualizar datos si el usuario existe
        usuario.firebaseUid = firebaseUid;
        usuario.nombre = displayName || usuario.nombre;
        usuario.avatar = photoURL || usuario.avatar;
        usuario.ultimoLogin = new Date();
        await usuario.save();

        return res.json({
          success: true,
          data: usuario.toPublicJSON(),
          message: "Usuario actualizado exitosamente",
          isNewUser: false,
        });
      }

      // Crear nuevo usuario
      const nuevoUsuario = new Usuario({
        firebaseUid: firebaseUid,
        email: email,
        nombre: displayName || "Usuario",
        avatar: photoURL || "",
        rol: "CLIENTE",
        activo: true,
        fechaRegistro: new Date(),
        ultimoLogin: new Date(),
        // No establecer password para usuarios de Firebase
      });

      await nuevoUsuario.save();

      res.status(201).json({
        success: true,
        data: nuevoUsuario.toPublicJSON(),
        message: "Usuario sincronizado exitosamente",
        isNewUser: true,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/usuarios/firebase/:firebaseUid - Obtener usuario por Firebase UID
router.get("/firebase/:firebaseUid", async (req, res, next) => {
  try {
    const { firebaseUid } = req.params;

    const usuario = await Usuario.findOne({ firebaseUid }).select("-password");

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
});

module.exports = router;
