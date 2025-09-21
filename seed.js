const mongoose = require("mongoose");
require("dotenv").config();

// Importar modelos
const TipoProducto = require("./models/TipoProducto");
const Producto = require("./models/Producto");
const Usuario = require("./models/Usuario");
const Imagen = require("./models/Imagen");

// Datos de tipos de productos
const tiposProductos = [
  {
    nombre: "Tenis Deportivos",
    slug: "tenis-deportivos",
    descripcion:
      "Calzado deportivo para running, entrenamiento y actividades físicas",
    orden: 1,
    traducciones: {
      es: {
        nombre: "Tenis Deportivos",
        descripcion:
          "Calzado deportivo para running, entrenamiento y actividades físicas",
      },
      en: {
        nombre: "Sports Sneakers",
        descripcion:
          "Sports footwear for running, training and physical activities",
      },
      fr: {
        nombre: "Baskets de Sport",
        descripcion:
          "Chaussures de sport pour la course, l'entraînement et les activités physiques",
      },
      pt: {
        nombre: "Tênis Esportivos",
        descripcion:
          "Calçados esportivos para corrida, treino e atividades físicas",
      },
    },
    metaDescripcion:
      "Tenis deportivos de alta calidad para running y entrenamiento",
    palabrasClave: [
      "tenis",
      "deportivos",
      "running",
      "entrenamiento",
      "zapatillas",
    ],
  },
  {
    nombre: "Zapatillas Casuales",
    slug: "zapatillas-casuales",
    descripcion: "Calzado cómodo y versátil para uso diario y casual",
    orden: 2,
    traducciones: {
      es: {
        nombre: "Zapatillas Casuales",
        descripcion: "Calzado cómodo y versátil para uso diario y casual",
      },
      en: {
        nombre: "Casual Sneakers",
        descripcion:
          "Comfortable and versatile footwear for daily and casual use",
      },
      fr: {
        nombre: "Baskets Décontractées",
        descripcion:
          "Chaussures confortables et polyvalentes pour un usage quotidien et décontracté",
      },
      pt: {
        nome: "Tênis Casuais",
        descripcion:
          "Calçados confortáveis e versáteis para uso diário e casual",
      },
    },
    metaDescripcion: "Zapatillas casuales cómodas para el día a día",
    palabrasClave: ["zapatillas", "casuales", "cómodas", "diario", "versátil"],
  },
  {
    nombre: "Tacones",
    slug: "tacones",
    descripcion: "Calzado elegante con tacón para ocasiones especiales",
    orden: 3,
    traducciones: {
      es: {
        nombre: "Tacones",
        descripcion: "Calzado elegante con tacón para ocasiones especiales",
      },
      en: {
        nombre: "Heels",
        descripcion: "Elegant heeled footwear for special occasions",
      },
      fr: {
        nombre: "Talons",
        descripcion:
          "Chaussures élégantes à talons pour les occasions spéciales",
      },
      pt: {
        nome: "Saltos",
        descripcion: "Calçados elegantes com salto para ocasiões especiais",
      },
    },
    metaDescripcion: "Tacones elegantes para ocasiones especiales",
    palabrasClave: ["tacones", "elegantes", "ocasiones", "especiales", "mujer"],
  },
  {
    nombre: "Botas",
    slug: "botas",
    descripcion:
      "Calzado resistente para climas fríos y actividades al aire libre",
    orden: 4,
    traducciones: {
      es: {
        nombre: "Botas",
        descripcion:
          "Calzado resistente para climas fríos y actividades al aire libre",
      },
      en: {
        nombre: "Boots",
        descripcion:
          "Durable footwear for cold climates and outdoor activities",
      },
      fr: {
        nombre: "Bottes",
        descripcion:
          "Chaussures résistantes pour les climats froids et les activités de plein air",
      },
      pt: {
        nome: "Botas",
        descripcion:
          "Calçados resistentes para climas frios e atividades ao ar livre",
      },
    },
    metaDescripcion:
      "Botas resistentes para climas fríos y actividades outdoor",
    palabrasClave: ["botas", "resistentes", "frío", "outdoor", "invierno"],
  },
  {
    nombre: "Mocasines",
    slug: "mocasines",
    descripcion: "Calzado elegante y cómodo sin cordones",
    orden: 5,
    traducciones: {
      es: {
        nombre: "Mocasines",
        descripcion: "Calzado elegante y cómodo sin cordones",
      },
      en: {
        nombre: "Loafers",
        descripcion: "Elegant and comfortable laceless footwear",
      },
      fr: {
        nombre: "Mocassins",
        descripcion: "Chaussures élégantes et confortables sans lacets",
      },
      pt: {
        nome: "Mocassins",
        descripcion: "Calçados elegantes e confortáveis sem cadarços",
      },
    },
    metaDescripcion: "Mocasines elegantes y cómodos sin cordones",
    palabrasClave: [
      "mocasines",
      "elegantes",
      "cómodos",
      "sin cordones",
      "formal",
    ],
  },
];

// Datos de productos
const productos = [
  // Tenis Deportivos
  {
    nombre: "Nike Air Max 270",
    descripcion:
      "Tenis deportivos Nike Air Max 270 con tecnología de amortiguación Max Air para máxima comodidad durante el running y actividades deportivas.",
    precio: 450000,
    stock: 25,
    marca: "Nike",
    modelo: "Air Max 270",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Negro", "Blanco", "Azul", "Rojo"],
    material: "Mesh transpirable con detalles en cuero sintético",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: true,
      descuento: 15,
      precioOferta: 382500,
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    },
    traducciones: {
      es: {
        nombre: "Nike Air Max 270",
        descripcion:
          "Tenis deportivos Nike Air Max 270 con tecnología de amortiguación Max Air para máxima comodidad durante el running y actividades deportivas.",
        metaDescripcion:
          "Nike Air Max 270 - Tenis deportivos con tecnología Max Air",
      },
      en: {
        nombre: "Nike Air Max 270",
        descripcion:
          "Nike Air Max 270 sports sneakers with Max Air cushioning technology for maximum comfort during running and sports activities.",
        metaDescripcion:
          "Nike Air Max 270 - Sports sneakers with Max Air technology",
      },
      fr: {
        nombre: "Nike Air Max 270",
        descripcion:
          "Baskets de sport Nike Air Max 270 avec technologie d'amortissement Max Air pour un confort maximal pendant la course et les activités sportives.",
        metaDescripcion:
          "Nike Air Max 270 - Baskets de sport avec technologie Max Air",
      },
      pt: {
        nome: "Nike Air Max 270",
        descripcion:
          "Tênis esportivos Nike Air Max 270 com tecnologia de amortecimento Max Air para máximo conforto durante corrida e atividades esportivas.",
        metaDescripcion:
          "Nike Air Max 270 - Tênis esportivos com tecnologia Max Air",
      },
    },
    metaDescripcion:
      "Nike Air Max 270 - Tenis deportivos con tecnología Max Air para running",
    palabrasClave: [
      "nike",
      "air max",
      "running",
      "deportivos",
      "amortiguación",
    ],
  },
  {
    nombre: "Adidas Ultraboost 22",
    descripcion:
      "Tenis de running Adidas Ultraboost 22 con Boost midsole para energía de retorno y Primeknit upper para ajuste perfecto.",
    precio: 520000,
    stock: 20,
    marca: "Adidas",
    modelo: "Ultraboost 22",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Negro", "Blanco", "Gris", "Azul"],
    material: "Primeknit upper con Boost midsole",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    traducciones: {
      es: {
        nombre: "Adidas Ultraboost 22",
        descripcion:
          "Tenis de running Adidas Ultraboost 22 con Boost midsole para energía de retorno y Primeknit upper para ajuste perfecto.",
        metaDescripcion:
          "Adidas Ultraboost 22 - Tenis de running con tecnología Boost",
      },
      en: {
        nombre: "Adidas Ultraboost 22",
        descripcion:
          "Adidas Ultraboost 22 running shoes with Boost midsole for energy return and Primeknit upper for perfect fit.",
        metaDescripcion:
          "Adidas Ultraboost 22 - Running shoes with Boost technology",
      },
      fr: {
        nombre: "Adidas Ultraboost 22",
        descripcion:
          "Chaussures de course Adidas Ultraboost 22 avec semelle intermédiaire Boost pour le retour d'énergie et upper Primeknit pour un ajustement parfait.",
        metaDescripcion:
          "Adidas Ultraboost 22 - Chaussures de course avec technologie Boost",
      },
      pt: {
        nome: "Adidas Ultraboost 22",
        descripcion:
          "Tênis de corrida Adidas Ultraboost 22 com entressola Boost para retorno de energia e upper Primeknit para ajuste perfeito.",
        metaDescripcion:
          "Adidas Ultraboost 22 - Tênis de corrida com tecnologia Boost",
      },
    },
    metaDescripcion:
      "Adidas Ultraboost 22 - Tenis de running con tecnología Boost",
    palabrasClave: ["adidas", "ultraboost", "running", "boost", "primeknit"],
  },
  {
    nombre: "Puma RS-X Reinvention",
    descripcion:
      "Zapatillas Puma RS-X Reinvention con diseño futurista y tecnología de amortiguación RS para estilo y comodidad.",
    precio: 380000,
    stock: 30,
    marca: "Puma",
    modelo: "RS-X Reinvention",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Negro", "Blanco", "Rosa", "Amarillo"],
    material: "Mesh y cuero sintético con detalles en TPU",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    oferta: {
      activa: true,
      descuento: 20,
      precioOferta: 304000,
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 días
    },
    traducciones: {
      es: {
        nombre: "Puma RS-X Reinvention",
        descripcion:
          "Zapatillas Puma RS-X Reinvention con diseño futurista y tecnología de amortiguación RS para estilo y comodidad.",
        metaDescripcion:
          "Puma RS-X Reinvention - Zapatillas futuristas con tecnología RS",
      },
      en: {
        nombre: "Puma RS-X Reinvention",
        descripcion:
          "Puma RS-X Reinvention sneakers with futuristic design and RS cushioning technology for style and comfort.",
        metaDescripcion:
          "Puma RS-X Reinvention - Futuristic sneakers with RS technology",
      },
      fr: {
        nombre: "Puma RS-X Reinvention",
        descripcion:
          "Baskets Puma RS-X Reinvention avec design futuriste et technologie d'amortissement RS pour style et confort.",
        metaDescripcion:
          "Puma RS-X Reinvention - Baskets futuristes avec technologie RS",
      },
      pt: {
        nome: "Puma RS-X Reinvention",
        descripcion:
          "Tênis Puma RS-X Reinvention com design futurista e tecnologia de amortecimento RS para estilo e conforto.",
        metaDescripcion:
          "Puma RS-X Reinvention - Tênis futuristas com tecnologia RS",
      },
    },
    metaDescripcion:
      "Puma RS-X Reinvention - Zapatillas futuristas con tecnología RS",
    palabrasClave: ["puma", "rs-x", "futurista", "estilo", "comodidad"],
  },
  // Zapatillas Casuales
  {
    nombre: "Converse Chuck Taylor All Star",
    descripcion:
      "Zapatillas clásicas Converse Chuck Taylor All Star, el ícono del calzado casual que nunca pasa de moda.",
    precio: 180000,
    stock: 50,
    marca: "Converse",
    modelo: "Chuck Taylor All Star",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Negro", "Blanco", "Rojo", "Azul", "Verde"],
    material: "Lona de algodón con suela de goma",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    traducciones: {
      es: {
        nombre: "Converse Chuck Taylor All Star",
        descripcion:
          "Zapatillas clásicas Converse Chuck Taylor All Star, el ícono del calzado casual que nunca pasa de moda.",
        metaDescripcion:
          "Converse Chuck Taylor All Star - Zapatillas clásicas casuales",
      },
      en: {
        nombre: "Converse Chuck Taylor All Star",
        descripcion:
          "Classic Converse Chuck Taylor All Star sneakers, the casual footwear icon that never goes out of style.",
        metaDescripcion:
          "Converse Chuck Taylor All Star - Classic casual sneakers",
      },
      fr: {
        nombre: "Converse Chuck Taylor All Star",
        descripcion:
          "Baskets classiques Converse Chuck Taylor All Star, l'icône de la chaussure décontractée qui ne se démode jamais.",
        metaDescripcion:
          "Converse Chuck Taylor All Star - Baskets classiques décontractées",
      },
      pt: {
        nome: "Converse Chuck Taylor All Star",
        descripcion:
          "Tênis clássicos Converse Chuck Taylor All Star, o ícone do calçado casual que nunca sai de moda.",
        metaDescripcion:
          "Converse Chuck Taylor All Star - Tênis clássicos casuais",
      },
    },
    metaDescripcion:
      "Converse Chuck Taylor All Star - Zapatillas clásicas casuales",
    palabrasClave: ["converse", "chuck taylor", "clásicas", "casuales", "lona"],
  },
  {
    nombre: "Vans Old Skool",
    descripcion:
      "Zapatillas Vans Old Skool con diseño clásico y durabilidad excepcional, perfectas para el skateboarding y uso diario.",
    precio: 220000,
    stock: 35,
    marca: "Vans",
    modelo: "Old Skool",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Negro", "Blanco", "Azul", "Rojo", "Verde"],
    material: "Canvas con detalles en cuero sintético",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    traducciones: {
      es: {
        nombre: "Vans Old Skool",
        descripcion:
          "Zapatillas Vans Old Skool con diseño clásico y durabilidad excepcional, perfectas para el skateboarding y uso diario.",
        metaDescripcion:
          "Vans Old Skool - Zapatillas clásicas para skateboarding",
      },
      en: {
        nombre: "Vans Old Skool",
        descripcion:
          "Vans Old Skool sneakers with classic design and exceptional durability, perfect for skateboarding and daily use.",
        metaDescripcion: "Vans Old Skool - Classic skateboarding sneakers",
      },
      fr: {
        nombre: "Vans Old Skool",
        descripcion:
          "Baskets Vans Old Skool avec design classique et durabilité exceptionnelle, parfaites pour le skateboard et l'usage quotidien.",
        metaDescripcion: "Vans Old Skool - Baskets classiques pour skateboard",
      },
      pt: {
        nome: "Vans Old Skool",
        descripcion:
          "Tênis Vans Old Skool com design clássico e durabilidade excepcional, perfeitos para skateboarding e uso diário.",
        metaDescripcion: "Vans Old Skool - Tênis clássicos para skateboarding",
      },
    },
    metaDescripcion: "Vans Old Skool - Zapatillas clásicas para skateboarding",
    palabrasClave: [
      "vans",
      "old skool",
      "skateboarding",
      "clásicas",
      "durabilidad",
    ],
  },
  // Tacones
  {
    nombre: "Tacones de Aguja Elegantes",
    descripcion:
      "Tacones de aguja elegantes en cuero genuino, perfectos para ocasiones especiales y eventos formales.",
    precio: 320000,
    stock: 15,
    marca: "Elegance",
    modelo: "Stiletto Classic",
    tallas: ["35", "36", "37", "38", "39", "40", "41"],
    colores: ["Negro", "Beige", "Rojo", "Azul"],
    material: "Cuero genuino con suela de cuero",
    genero: "MUJER",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    traducciones: {
      es: {
        nombre: "Tacones de Aguja Elegantes",
        descripcion:
          "Tacones de aguja elegantes en cuero genuino, perfectos para ocasiones especiales y eventos formales.",
        metaDescripcion:
          "Tacones de Aguja Elegantes - Calzado formal para mujer",
      },
      en: {
        nombre: "Elegant Stiletto Heels",
        descripcion:
          "Elegant stiletto heels in genuine leather, perfect for special occasions and formal events.",
        metaDescripcion: "Elegant Stiletto Heels - Formal footwear for women",
      },
      fr: {
        nombre: "Talons Aiguilles Élégants",
        descripcion:
          "Talons aiguilles élégants en cuir véritable, parfaits pour les occasions spéciales et événements formels.",
        metaDescripcion:
          "Talons Aiguilles Élégants - Chaussures formelles pour femmes",
      },
      pt: {
        nome: "Saltos Agulha Elegantes",
        descripcion:
          "Saltos agulha elegantes em couro legítimo, perfeitos para ocasiões especiais e eventos formais.",
        metaDescripcion:
          "Saltos Agulha Elegantes - Calçados formais para mulheres",
      },
    },
    metaDescripcion: "Tacones de Aguja Elegantes - Calzado formal para mujer",
    palabrasClave: ["tacones", "aguja", "elegantes", "cuero", "formal"],
  },
  // Botas
  {
    nombre: "Botas Timberland Premium",
    descripcion:
      "Botas Timberland Premium con construcción de 6 pulgadas, perfectas para actividades outdoor y climas adversos.",
    precio: 680000,
    stock: 20,
    marca: "Timberland",
    modelo: "6-Inch Premium",
    tallas: ["38", "39", "40", "41", "42", "43", "44", "45", "46"],
    colores: ["Marrón", "Negro", "Amarillo"],
    material: "Cuero premium con forro de lana",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "INVIERNO",
    destacado: true,
    traducciones: {
      es: {
        nombre: "Botas Timberland Premium",
        descripcion:
          "Botas Timberland Premium con construcción de 6 pulgadas, perfectas para actividades outdoor y climas adversos.",
        metaDescripcion:
          "Botas Timberland Premium - Calzado outdoor resistente",
      },
      en: {
        nombre: "Timberland Premium Boots",
        descripcion:
          "Timberland Premium boots with 6-inch construction, perfect for outdoor activities and adverse weather.",
        metaDescripcion: "Timberland Premium Boots - Durable outdoor footwear",
      },
      fr: {
        nombre: "Bottes Timberland Premium",
        descripcion:
          "Bottes Timberland Premium avec construction de 6 pouces, parfaites pour les activités de plein air et climats adverses.",
        metaDescripcion:
          "Bottes Timberland Premium - Chaussures outdoor résistantes",
      },
      pt: {
        nome: "Botas Timberland Premium",
        descripcion:
          "Botas Timberland Premium com construção de 6 polegadas, perfeitas para atividades outdoor e climas adversos.",
        metaDescripcion:
          "Botas Timberland Premium - Calçados outdoor resistentes",
      },
    },
    metaDescripcion: "Botas Timberland Premium - Calzado outdoor resistente",
    palabrasClave: ["timberland", "botas", "outdoor", "resistente", "premium"],
  },
  // Mocasines
  {
    nombre: "Mocasines de Cuero Italiano",
    descripcion:
      "Mocasines elegantes en cuero italiano de alta calidad, perfectos para ocasiones formales y de negocios.",
    precio: 450000,
    stock: 25,
    marca: "Italian Leather",
    modelo: "Classic Loafers",
    tallas: ["38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Negro", "Marrón", "Azul", "Burgundy"],
    material: "Cuero italiano premium con suela de cuero",
    genero: "HOMBRE",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    traducciones: {
      es: {
        nombre: "Mocasines de Cuero Italiano",
        descripcion:
          "Mocasines elegantes en cuero italiano de alta calidad, perfectos para ocasiones formales y de negocios.",
        metaDescripcion:
          "Mocasines de Cuero Italiano - Calzado formal elegante",
      },
      en: {
        nombre: "Italian Leather Loafers",
        descripcion:
          "Elegant loafers in high-quality Italian leather, perfect for formal occasions and business.",
        metaDescripcion: "Italian Leather Loafers - Elegant formal footwear",
      },
      fr: {
        nombre: "Mocassins en Cuir Italien",
        descripcion:
          "Mocassins élégants en cuir italien de haute qualité, parfaits pour les occasions formelles et les affaires.",
        metaDescripcion:
          "Mocassins en Cuir Italien - Chaussures formelles élégantes",
      },
      pt: {
        nome: "Mocassins de Couro Italiano",
        descripcion:
          "Mocassins elegantes em couro italiano de alta qualidade, perfeitos para ocasiões formais e negócios.",
        metaDescripcion:
          "Mocassins de Couro Italiano - Calçados formais elegantes",
      },
    },
    metaDescripcion: "Mocasines de Cuero Italiano - Calzado formal elegante",
    palabrasClave: ["mocasines", "cuero", "italiano", "formal", "elegante"],
  },
];

// Datos de usuarios
const usuarios = [
  {
    nombre: "Admin Sistema",
    email: "admin@tekashishoes.com",
    password: "admin123456",
    telefono: "+57 300 123 4567",
    direccion: "Calle 123 #45-67, Bogotá, Colombia",
    rol: "ADMIN",
    ubicacion: {
      latitud: 4.6097,
      longitud: -74.0817,
      direccionCompleta: "Calle 123 #45-67, Bogotá, Colombia",
      ciudad: "Bogotá",
      pais: "Colombia",
    },
    idioma: "es",
  },
  {
    nombre: "María González",
    email: "maria.gonzalez@email.com",
    password: "password123",
    telefono: "+57 310 987 6543",
    direccion: "Carrera 15 #93-47, Medellín, Colombia",
    rol: "CLIENTE",
    ubicacion: {
      latitud: 6.2442,
      longitud: -75.5812,
      direccionCompleta: "Carrera 15 #93-47, Medellín, Colombia",
      ciudad: "Medellín",
      pais: "Colombia",
    },
    idioma: "es",
  },
  {
    nombre: "John Smith",
    email: "john.smith@email.com",
    password: "password123",
    telefono: "+1 555 123 4567",
    direccion: "123 Main St, New York, USA",
    rol: "CLIENTE",
    ubicacion: {
      latitud: 40.7128,
      longitud: -74.006,
      direccionCompleta: "123 Main St, New York, USA",
      ciudad: "New York",
      pais: "USA",
    },
    idioma: "en",
  },
  {
    nombre: "Sophie Martin",
    email: "sophie.martin@email.com",
    password: "password123",
    telefono: "+33 1 23 45 67 89",
    direccion: "15 Rue de la Paix, Paris, France",
    rol: "CLIENTE",
    ubicacion: {
      latitud: 48.8566,
      longitud: 2.3522,
      direccionCompleta: "15 Rue de la Paix, Paris, France",
      ciudad: "Paris",
      pais: "France",
    },
    idioma: "fr",
  },
  {
    nombre: "Carlos Silva",
    email: "carlos.silva@email.com",
    password: "password123",
    telefono: "+55 11 98765 4321",
    direccion: "Av. Paulista, 1000, São Paulo, Brazil",
    rol: "CLIENTE",
    ubicacion: {
      latitud: -23.5505,
      longitud: -46.6333,
      direccionCompleta: "Av. Paulista, 1000, São Paulo, Brazil",
      ciudad: "São Paulo",
      pais: "Brazil",
    },
    idioma: "pt",
  },
];

// Función para conectar a la base de datos
async function conectarDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/tekashi_shoes"
    );
    console.log("✅ Conectado a MongoDB");
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error);
    process.exit(1);
  }
}

// Función para limpiar la base de datos
async function limpiarDB() {
  try {
    await Producto.deleteMany({});
    await TipoProducto.deleteMany({});
    await Usuario.deleteMany({});
    await Imagen.deleteMany({});
    console.log("🧹 Base de datos limpiada");
  } catch (error) {
    console.error("❌ Error limpiando la base de datos:", error);
  }
}

// Función para poblar la base de datos
async function poblarDB() {
  try {
    // Crear tipos de productos
    console.log("📦 Creando tipos de productos...");
    const tiposCreados = await TipoProducto.insertMany(tiposProductos);
    console.log(`✅ ${tiposCreados.length} tipos de productos creados`);

    // Crear productos con referencias a tipos
    console.log("👟 Creando productos...");
    const productosConTipos = productos.map((producto, index) => {
      const tipoIndex = Math.floor(index / 2); // Distribuir productos entre tipos
      return {
        ...producto,
        slug: producto.nombre
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim("-"),
        tipoProductoId: tiposCreados[tipoIndex]._id,
      };
    });

    const productosCreados = await Producto.insertMany(productosConTipos);
    console.log(`✅ ${productosCreados.length} productos creados`);

    // Crear usuarios
    console.log("👥 Creando usuarios...");
    const usuariosCreados = await Usuario.insertMany(usuarios);
    console.log(`✅ ${usuariosCreados.length} usuarios creados`);

    // Actualizar contadores de productos por tipo
    console.log("📊 Actualizando contadores...");
    for (const tipo of tiposCreados) {
      await tipo.actualizarContadorProductos();
    }

    console.log("🎉 Base de datos poblada exitosamente!");
    console.log("\n📋 Resumen:");
    console.log(`- Tipos de productos: ${tiposCreados.length}`);
    console.log(`- Productos: ${productosCreados.length}`);
    console.log(`- Usuarios: ${usuariosCreados.length}`);
    console.log("\n🔑 Credenciales de prueba:");
    console.log("Admin: admin@tekashishoes.com / admin123456");
    console.log("Cliente: maria.gonzalez@email.com / password123");
  } catch (error) {
    console.error("❌ Error poblando la base de datos:", error);
  }
}

// Función principal
async function main() {
  console.log("🚀 Iniciando seeding de la base de datos...");

  await conectarDB();
  await limpiarDB();
  await poblarDB();

  console.log("\n✅ Seeding completado!");
  process.exit(0);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { conectarDB, limpiarDB, poblarDB };
