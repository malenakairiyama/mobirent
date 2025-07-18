// backend/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const asyncHandler = require('express-async-handler');
const User = require("../models/User");

// *** AGREGAR ESTAS LÍNEAS PARA DEPURAR ***
console.log('authMiddleware: Tipo de jwt:', typeof jwt);
console.log('authMiddleware: Valor de User:', User); // Debería ser un modelo de Mongoose
// *****************************************

// Middleware de protección: Verifica si el usuario está autenticado con un token válido
const protect = asyncHandler(async (req, res, next) => { // <--- THE FIX IS HERE!
  console.log("→ authMiddleware: headers.authorization =", req.headers.authorization);
  
  let token;

  // Comprueba si el encabezado de autorización existe y empieza con 'Bearer'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extrae el token del encabezado (formato: "Bearer TOKEN")
      token = req.headers.authorization.split(" ")[1];
      console.log("→ authMiddleware: extracted token =", token);

      // Verifica el token usando la clave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("→ authMiddleware: decoded payload =", decoded);

      // Busca el usuario en la base de datos usando el ID del token
      // y adjunta el usuario al objeto 'req' (sin la contraseña)
      req.user = await User.findById(decoded.id).select("-password");

      // Si no se encuentra el usuario, significa que el token es válido pero el usuario no existe
      if (!req.user) {
        console.log("→ authMiddleware: user not found in DB");
        return res
          .status(401)
          .json({ message: "No autorizado, usuario no encontrado" });
      }

      console.log("→ authMiddleware: user authenticated, id =", req.user._id);
      next(); // El usuario está autenticado, pasa al siguiente middleware o a la ruta
    } catch (error) {
      console.error(error); // Imprime el error para depuración
      res
        .status(401)
        .json({ message: "No autorizado, token fallido o expirado" });
    }
  }

  // Si no hay token en el encabezado
  if (!token) {
    console.log("→ authMiddleware: no token en header");
    res.status(401).json({ message: "No autorizado, no hay token" });
  }
}); // <--- Make sure this closing parenthesis is here!

// Middleware de autorización: Verifica si el usuario autenticado tiene el rol requerido
const authorize = (...roles) => {
  // Acepta múltiples roles como argumentos (ej: 'admin', 'employee')
  return (req, res, next) => {
    // req.user viene del middleware 'protect'
    if (!req.user || !roles.includes(req.user.role)) {
      // Si el usuario no está definido o su rol no está en la lista de roles permitidos
      return res
        .status(403)
        .json({ message: "Acceso denegado, no tienes el rol requerido" });
    }
    next(); // El usuario tiene el rol adecuado, pasa al siguiente middleware o a la ruta
  };
};

module.exports = {
  protect,
  authorize,
};
