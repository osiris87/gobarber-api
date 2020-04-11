import User from "./../models/User";
import Appointment from "./../models/Appointment";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { Op } from "sequelize";

class ScheduleController {
  async index(req, res) {
    const provider = await User.findOne({
      where: { id: req.userId, provider: true }
    });

    if (!provider) {
      return res.status(401).json({ error: "Você não é um provider" });
    }

    const parseDate = parseISO(req.query.date);

    const appointments = await Appointment.findAll({
      where: {
        provider_id: req.userId,
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(parseDate), endOfDay(parseDate)]
        }
      }
    });

    return res.json(appointments);
  }
}

export default new ScheduleController();
