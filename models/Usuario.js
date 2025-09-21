const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es requerido"],
      trim: true,
      maxlength: [100, "El nombre no puede exceder 100 caracteres"],
    },
    email: {
      type: String,
      required: [true, "El email es requerido"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Email inválido"],
    },
    password: {
      type: String,
      required: [true, "La contraseña es requerida"],
      minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
    },
    telefono: {
      type: String,
      trim: true,
      maxlength: [20, "El teléfono no puede exceder 20 caracteres"],
    },
    direccion: {
      type: String,
      trim: true,
      maxlength: [200, "La dirección no puede exceder 200 caracteres"],
    },
    rol: {
      type: String,
      enum: ["CLIENTE", "ADMIN"],
      default: "CLIENTE",
    },
    activo: {
      type: Boolean,
      default: true,
    },
    ultimoLogin: {
      type: Date,
      default: null,
    },
    fechaRegistro: {
      type: Date,
      default: Date.now,
    },
    // Campos para Firebase Auth
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true, // Permite valores null únicos
    },
    // Campos para geolocalización
    ubicacion: {
      latitud: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitud: {
        type: Number,
        min: -180,
        max: 180,
      },
      direccionCompleta: String,
      ciudad: String,
      pais: String,
    },
    // Preferencias de idioma
    idioma: {
      type: String,
      default: "es",
      enum: ["es", "en", "fr", "pt"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices para optimizar consultas
usuarioSchema.index({ email: 1 });
usuarioSchema.index({ firebaseUid: 1 });
usuarioSchema.index({ rol: 1 });
usuarioSchema.index({ activo: 1 });

// Middleware para encriptar contraseña antes de guardar
usuarioSchema.pre("save", async function (next) {
  // Solo encriptar si la contraseña ha sido modificada
  if (!this.isModified("password")) return next();

  try {
    // Encriptar contraseña con bcrypt
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
usuarioSchema.methods.compararPassword = async function (passwordCandidata) {
  return await bcrypt.compare(passwordCandidata, this.password);
};

// Método para obtener datos públicos del usuario (sin contraseña)
usuarioSchema.methods.toPublicJSON = function () {
  const usuario = this.toObject();
  delete usuario.password;
  delete usuario.__v;
  return usuario;
};

// Método estático para buscar por email
usuarioSchema.statics.buscarPorEmail = function (email) {
  return this.findOne({ email: email.toLowerCase(), activo: true });
};

// Método estático para verificar si existe un email
usuarioSchema.statics.existeEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Virtual para obtener el nombre completo
usuarioSchema.virtual("nombreCompleto").get(function () {
  return this.nombre;
});

// Middleware para actualizar último login
usuarioSchema.methods.actualizarUltimoLogin = function () {
  this.ultimoLogin = new Date();
  return this.save();
};

module.exports = mongoose.model("Usuario", usuarioSchema);

