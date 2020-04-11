import { startOfHour, parseISO, isBefore, format, subHours } from "date-fns";
import pt from "date-fns/locale/pt";

import User from "./../models/User";
import File from "./../models/File";

import Appointment from "./../models/Appointment";
import Notification from "./../schemas/Notification";

import CancellationMail from "./../jobs/CancellationMail";
import Queue from "./../../lib/Queue";

import * as Yup from "yup";

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: {
        user_id: req.userId,
        canceled_at: null,
      },
      order: ["date"],
      limit: 20,
      offset: (page - 1) * 20,
      attributes: ["id", "date", "past", "cancelable"],
      include: [
        {
          model: User,
          as: "provider",
          attributes: ["id", "name", "email"],
          include: [
            {
              model: File,
              as: "avatar",
              attributes: ["url", "path"],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      date: Yup.date().required(),
      provider_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const { provider_id, date } = req.body;

    const isProvider = await User.findOne({
      where: {
        id: provider_id,
        provider: true,
      },
    });

    if (!isProvider) {
      return res.status(401).json({ error: "Esse usuario não é um provider" });
    }

    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: "horario não permitido" });
    }

    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res.status(400).json({ error: "Hoario não está vago" });
    }

    if (req.userId === provider_id) {
      return res
        .status(400)
        .json({ error: "Você não pode agendar um horario para você mesmo" });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    const user = await User.findByPk(req.userId);
    const formatteDate = format(hourStart, "'dia' dd 'de' MMMM', às' H:mm'h'", {
      locale: pt,
    });

    await Notification.create({
      content: `Novo agendamento de ${user.name} para o ${formatteDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId,
      },
      include: [
        {
          model: User,
          as: "provider",
          attributes: ["name", "email"],
        },
        {
          model: User,
          as: "user",
          attributes: ["name"],
        },
      ],
    });

    if (!appointment) {
      return res.status(401).json({
        error: "Você não tem permissão para cancelar esse agendamento.",
      });
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error:
          "Você só pode cancelar um agendamneto com até 2 horas de antecendencia",
      });
    }

    appointment.canceled_at = new Date();
    await appointment.save();

    await Queue.add(CancellationMail.key, { appointment });

    return res.json(appointment);
  }
}

export default new AppointmentController();
