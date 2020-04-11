import jwt from "jsonwebtoken";

import authConfig from "../../config/auth";
import User from "../models/User";

import * as Yup from "yup";

class SessionController {
  async store(req, res) {
    const scheme = Yup.object().shape({
      email: Yup.string().required(),
      password: Yup.string().required()
    });

    if (!(await scheme.isValid(req.body))) {
      return res.status(400).json({ error: "Validation fails" });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "email não encontrado" });
    }

    if (!(await user.checkPassword(password))) {
      return res.status(401).json({ error: "Erro de senha" });
    }

    const { id, name } = user;
    const { secret, expiresIn } = authConfig;

    res.json({
      user: {
        id,
        name,
        email,
        token: jwt.sign({ id }, secret, { expiresIn })
      }
    });
  }
}

export default new SessionController();
