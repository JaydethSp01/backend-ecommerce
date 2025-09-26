const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

// Inicializar Firebase Admin solo si las credenciales están disponibles
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (
    !firebaseInitialized &&
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    try {
      // Limpiar y formatear la clave privada
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, "\n")
        ?.replace(/"/g, "")
        ?.trim();
      
      if (!privateKey || !privateKey.includes("BEGIN PRIVATE KEY")) {
        throw new Error("Invalid private key format");
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
          privateKey: privateKey,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          clientId: process.env.FIREBASE_CLIENT_ID,
          authUri: process.env.FIREBASE_AUTH_URI,
          tokenUri: process.env.FIREBASE_TOKEN_URI,
          authProviderX509CertUrl:
            process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
          clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        }),
      });
      firebaseInitialized = true;
      console.log("✅ Firebase Admin initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing Firebase Admin:", error.message);
      console.log("🔄 Continuing without Firebase authentication...");
      firebaseInitialized = false;
    }
  } else if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
    console.log("⚠️ Firebase credentials not found, continuing without Firebase authentication");
    firebaseInitialized = false;
  }
};

// Inicializar Firebase al cargar el módulo
initializeFirebase();

// Middleware para verificar autenticación con Firebase
const verificarFirebaseAuth = async (req, res, next) => {
  try {
    if (!firebaseInitialized) {
      console.log("⚠️ Firebase not initialized, skipping authentication");
      // Para desarrollo, permitir acceso sin autenticación
      req.user = { uid: "demo-user", email: "demo@example.com" };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Token de autorización requerido",
        message: "Debe proporcionar un token de autorización válido",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verificar el token con Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Buscar o crear el usuario en la base de datos
    let usuario = await Usuario.findOne({ firebaseUid: decodedToken.uid });

    if (!usuario) {
      // Crear usuario si no existe
      usuario = new Usuario({
        firebaseUid: decodedToken.uid,
        nombre: decodedToken.name || "Usuario",
        email: decodedToken.email,
        rol: "CLIENTE",
        activo: true,
        fechaRegistro: new Date(),
      });
      await usuario.save();
    }

    // Agregar información del usuario a la request
    req.usuario = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      userId: usuario._id,
    };

    next();
  } catch (error) {
    console.error("Error en verificarFirebaseAuth:", error);

    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        success: false,
        error: "Token expirado",
        message: "Su sesión ha expirado, por favor inicie sesión nuevamente",
      });
    }

    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({
        success: false,
        error: "Token inválido",
        message: "El token de autorización no es válido",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Error de autenticación",
      message: "No se pudo verificar la autenticación",
    });
  }
};

// Middleware para verificar si el usuario es administrador
const verificarAdmin = async (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado",
        message: "Debe estar autenticado para acceder a esta funcionalidad",
      });
    }

    const usuario = await Usuario.findOne({ firebaseUid: req.usuario.uid });

    if (!usuario || usuario.rol !== "ADMIN") {
      return res.status(403).json({
        success: false,
        error: "Acceso denegado",
        message:
          "No tiene permisos de administrador para acceder a esta funcionalidad",
      });
    }

    next();
  } catch (error) {
    console.error("Error en verificarAdmin:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: "Error al verificar permisos de administrador",
    });
  }
};

// Middleware para verificar si el usuario es propietario del recurso
const verificarPropietario = async (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado",
        message: "Debe estar autenticado para acceder a esta funcionalidad",
      });
    }

    const resourceId = req.params.id;
    const usuario = await Usuario.findOne({ firebaseUid: req.usuario.uid });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
        message: "El usuario no existe en la base de datos",
      });
    }

    // Verificar si el usuario es propietario del recurso o es administrador
    if (usuario._id.toString() !== resourceId && usuario.rol !== "ADMIN") {
      return res.status(403).json({
        success: false,
        error: "Acceso denegado",
        message: "No tiene permisos para acceder a este recurso",
      });
    }

    next();
  } catch (error) {
    console.error("Error en verificarPropietario:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message: "Error al verificar permisos de propietario",
    });
  }
};

// Middleware para autenticación opcional (permite acceso sin autenticación)
const autenticacionOpcional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("🔍 Auth header:", authHeader ? "Presente" : "Ausente");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No hay token, continuar sin autenticación
      console.log("⚠️ No hay token, continuando sin autenticación");
      req.usuario = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    console.log("🔍 Token recibido:", token.substring(0, 20) + "...");
    let usuario = null;

    // Intentar verificar como token de Firebase primero
    if (firebaseInitialized) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        usuario = await Usuario.findOne({ firebaseUid: decodedToken.uid });
        if (usuario) {
          console.log("✅ Usuario autenticado con Firebase:", usuario._id);
          req.usuario = usuario;
          return next();
        }
      } catch (firebaseError) {
        console.log("❌ Token no es de Firebase:", firebaseError.message);
      }
    }

    // Si no es token de Firebase, intentar como token del backend
    try {
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      );
      console.log("🔍 Token del backend decodificado:", decodedToken);
      usuario = await Usuario.findById(decodedToken.userId);

      if (usuario) {
        console.log("✅ Usuario autenticado con backend:", usuario._id);
        req.usuario = usuario;
        return next();
      }
    } catch (backendError) {
      console.log("❌ Token no es del backend:", backendError.message);
    }

    // Si no se pudo autenticar, continuar sin autenticación
    console.log("⚠️ No se pudo autenticar, continuando sin autenticación");
    req.usuario = null;
    next();
  } catch (error) {
    console.error("Error en autenticacionOpcional:", error);
    // En caso de error, continuar sin autenticación
    req.usuario = null;
    next();
  }
};

// Middleware para validar datos con Joi
const validarDatos = (schema) => {
  return (req, res, next) => {
    try {
      // Limpiar el body de valores undefined
      const cleanBody = {};
      for (const [key, value] of Object.entries(req.body || {})) {
        if (value !== undefined) {
          cleanBody[key] = value;
        }
      }

      const { error, value } = schema.validate(cleanBody, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false,
      });

      if (error) {
        const errores = error.details.map((detail) => ({
          campo: detail.path.join("."),
          mensaje: detail.message,
        }));

        return res.status(400).json({
          success: false,
          error: "Datos de entrada inválidos",
          message: "Los datos proporcionados no son válidos",
          detalles: errores,
        });
      }

      req.body = value;
      next();
    } catch (validationError) {
      console.error("Error en validación:", validationError);
      return res.status(400).json({
        success: false,
        error: "Error de validación",
        message: "Error interno en la validación de datos",
      });
    }
  };
};

// Middleware para manejar errores de autenticación
const manejarErrorAuth = (error, req, res, next) => {
  console.error("Error de autenticación:", error);

  if (error.code === "auth/id-token-expired") {
    return res.status(401).json({
      success: false,
      error: "Token expirado",
      message: "Su sesión ha expirado, por favor inicie sesión nuevamente",
    });
  }

  if (error.code === "auth/invalid-id-token") {
    return res.status(401).json({
      success: false,
      error: "Token inválido",
      message: "El token de autorización no es válido",
    });
  }

  if (error.code === "auth/user-not-found") {
    return res.status(404).json({
      success: false,
      error: "Usuario no encontrado",
      message: "El usuario especificado no existe",
    });
  }

  return res.status(500).json({
    success: false,
    error: "Error interno del servidor",
    message: "Error de autenticación",
  });
};

// Middleware híbrido para verificar autenticación (Firebase o Backend)
const verificarAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("🔍 Auth header recibido:", authHeader ? "Presente" : "Ausente");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No hay token de autorización");
      return res.status(401).json({
        success: false,
        error: "Token requerido",
        message: "Debe proporcionar un token de autorización válido",
      });
    }

    const token = authHeader.split(" ")[1];
    let usuario = null;

    console.log("🔍 Token recibido:", token.substring(0, 20) + "...");
    console.log("🔍 Longitud del token:", token.length);
    console.log("🔍 Firebase inicializado:", firebaseInitialized);
    console.log("🔍 Token completo (primeros 50 chars):", token.substring(0, 50) + "...");

    // Intentar verificar como token de Firebase primero
    if (firebaseInitialized) {
      try {
        console.log("🔐 Verificando token con Firebase...");
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log("✅ Token de Firebase válido:", decodedToken.uid);
        
        usuario = await Usuario.findOne({ firebaseUid: decodedToken.uid });
        console.log("👤 Usuario encontrado en BD:", usuario ? usuario._id : "No encontrado");

        if (usuario) {
          req.usuario = usuario;
          console.log("✅ Usuario autenticado correctamente");
          return next();
        } else {
          console.log("🔄 Usuario no encontrado, creando usuario en BD...");
          // Crear usuario si no existe
          usuario = new Usuario({
            firebaseUid: decodedToken.uid,
            nombre: decodedToken.name || "Usuario",
            email: decodedToken.email,
            rol: "CLIENTE",
            activo: true,
            fechaRegistro: new Date(),
          });
          await usuario.save();
          console.log("✅ Usuario creado en BD:", usuario._id);
          req.usuario = usuario;
          return next();
        }
      } catch (firebaseError) {
        console.log("❌ Error verificando token de Firebase:", firebaseError.message);
        console.log("❌ Código de error:", firebaseError.code);
      }
    } else {
      console.log("⚠️ Firebase no está inicializado - usando modo de desarrollo");
      // Modo de desarrollo: permitir acceso con token de prueba
      if (token === "test-token" || token.length > 100) {
        console.log("🔧 Modo desarrollo: permitiendo acceso");
        // Buscar usuario por ID del frontend
        const userId = req.params.userId;
        if (userId) {
          usuario = await Usuario.findById(userId);
          if (usuario) {
            req.usuario = usuario;
            console.log("✅ Usuario encontrado en modo desarrollo:", usuario._id);
            return next();
          }
        }
      }
    }

    // Si no es token de Firebase, intentar como token del backend
    try {
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      );
      usuario = await Usuario.findById(decodedToken.userId);

      if (usuario) {
        req.usuario = usuario;
        return next();
      }
    } catch (backendError) {
      console.log("❌ Token no es del backend:", backendError.message);
    }

    return res.status(401).json({
      success: false,
      error: "Token inválido",
      message: "El token proporcionado no es válido",
    });
  } catch (error) {
    console.error("Error en verificarAuth:", error);
    return res.status(500).json({
      success: false,
      error: "Error de autenticación",
      message: "Error interno del servidor",
    });
  }
};

module.exports = {
  verificarFirebaseAuth,
  verificarAuth,
  verificarAdmin,
  verificarPropietario,
  autenticacionOpcional,
  validarDatos,
  manejarErrorAuth,
  initializeFirebase,
};
