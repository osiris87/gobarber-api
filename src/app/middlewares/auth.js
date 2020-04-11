import jwt from "jsonwebtoken";
import authConfig from "../../config/auth";

export default (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status("401").json({ error: "Token not provider" });
  }

  const [bearer, token] = authHeader.split(" ");

  jwt.verify(token, authConfig.secret, (error, decode) => {
    if (error) {
      return res.status("401").json({ error: "Token invalid" });
    }
    req.userId = decode.id;
    return next();
  });
};
