import User from "../models/User";
import * as Yup from "yup";

class UserController {
  async store(req, res) {
    const scheme = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string().required(),
      password: Yup.string().required().min(6),
    });

    if (!(await scheme.isValid(req.body))) {
      return res.status(400).json({ error: "Validation fails" });
    }

    const checkUser = await User.findOne({ where: { email: req.body.email } });
    if (checkUser) {
      return res.status(400).json({ error: "Usuario já existente" });
    }
    const { id, name, email, provider } = await User.create(req.body);
    return res.json({
      id,
      name,
      email,
      provider,
    });
  }

  async update(req, res) {
    const scheme = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string(),
      oldPassword: Yup.string().min(6),
      password: Yup.string()
        .min(6)
        .when("oldPassword", (oldPassword, field) =>
          oldPassword ? field.required() : field
        ),
      confirmPassword: Yup.string().when("password", (password, field) =>
        password ? field.required().oneOf([Yup.ref("password")]) : field
      ),
    });

    if (!(await scheme.isValid(req.body))) {
      return res.status(400).json({ error: "Validation fails" });
    }

    const { email, oldPassword } = req.body;

    const user = await User.findByPk(req.userId);

    if (email && user.email !== email) {
      const checkUser = await User.findOne({ where: { email } });
      if (!checkUser) {
        return res.status(400).json({ error: "Usuario já existe" });
      }
    }

    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return res.status(401).json({ error: "Password does not match" });
    }

    const { id, name, provider } = await user.update(req.body);

    return res.json({
      id,
      name,
      email,
      provider,
    });
  }
}

export default new UserController();
