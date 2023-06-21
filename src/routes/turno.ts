import { Request, Response } from 'express';
import Usuario from '../models/Usuario';
import Turno, { ITurnoModel } from '../models/Turno';
import AuthMiddleware from '../middleware/auth';
import MongoService from '../services/Mongo';
import AuthService from '../services/auth';
import UsuarioService from '../services/Usuario';
const excel = require('exceljs');

const express = require('express');
const router = express.Router();

declare module 'express-serve-static-core' {
    interface Request {
        userId?: string;
    }
}
//Inicializacion de servicios
const mongoService = new MongoService();
const authService = new AuthService();
const usuarioService = new UsuarioService(mongoService, authService);
//Inicializacion de middleware
new AuthMiddleware(usuarioService);

router.post('/free-appointments', [AuthMiddleware.verifyToken, AuthMiddleware.isPaciente], async (req: Request, res: Response) => {
    try {
        const { currentDateBody, endDateBody } = req.body;

        if (!currentDateBody || !endDateBody) {
            return res.status(400).json({ error: 'Datos invalidos de entrada.' });
        }

        // Parseo los datos de entrada
        const startDate = new Date(currentDateBody);
        const end = new Date(endDateBody);
        const endDate = new Date(end.setDate(end.getDate() + 1));

        // Lunes a viernes
        const startOfWeek = new Date(startDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 5);

        // Busco doctores que trabajen en el rango
        const doctors = await Usuario.find({
            workingDays: {
                $elemMatch: {
                    dayOfWeek: { $gte: 1, $lte: 5 },
                    startTime: { $lt: '20:00' },
                    endTime: { $gt: '09:00' }
                }
            }
        });

        // Calculo turnos libres
        const freeAppointments = [];
        let currentDate = new Date(startOfWeek);
        while (currentDate < endDate) {
            let now = new Date();
            if (currentDate.getDay() < now.getDay() && currentDate.getDate() < now.getDate()) {
                currentDate.setDate(currentDate.getDate() + 1);
            } else {
                now = currentDate.getDate() === now.getDate() ? new Date() : currentDate;
                const date = currentDate
                    .toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    })
                    .replace(/[/]/g, '-');
                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    const appointments = [];
                    for (const doctor of doctors) {
                        if (doctor.workingDays) {
                            const workingDay = doctor.workingDays.find((day) => day.dayOfWeek === dayOfWeek);
                            if (workingDay) {
                                const startTime = new Date(currentDate);
                                startTime.setHours(Number(workingDay.startTime.split(':')[0]));
                                startTime.setMinutes(Number(workingDay.startTime.split(':')[1]));
                                const endTime = new Date(currentDate);
                                endTime.setHours(Number(workingDay.endTime.split(':')[0]));
                                endTime.setMinutes(Number(workingDay.endTime.split(':')[1]));
                                const duration = 30 * 60 * 1000; // 30 minutos en milisegundos
                                const startHour = Math.max(now.getHours(), startTime.getHours());
                                const startMinute = Math.ceil(now.getMinutes() / 30) * 30;
                                let appointmentTime = new Date(currentDate);
                                appointmentTime.setHours(startHour);
                                appointmentTime.setMinutes(startMinute);
                                while (appointmentTime.getTime() + duration <= endTime.getTime()) {
                                    const startAppointment = new Date(appointmentTime);
                                    const endAppointment = new Date(appointmentTime.getTime() + duration);
                                    const existingAppointment = await Turno.find({
                                        doctorId: doctor._id,
                                        date: date,
                                        startTime: startAppointment
                                            .toLocaleString('es-AR', {
                                                timeZone: 'America/Argentina/Buenos_Aires',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            .split(', ')[0],
                                        endTime: endAppointment
                                            .toLocaleString('es-AR', {
                                                timeZone: 'America/Argentina/Buenos_Aires',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            .split(', ')[0]
                                    });
                                    if (existingAppointment.length === 0) {
                                        appointments.push({
                                            doctorId: doctor._id,
                                            date: date,
                                            startTime: startAppointment
                                                .toLocaleString('es-AR', {
                                                    timeZone: 'America/Argentina/Buenos_Aires',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                .split(', ')[0],
                                            endTime: endAppointment
                                                .toLocaleString('es-AR', {
                                                    timeZone: 'America/Argentina/Buenos_Aires',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                .split(', ')[0]
                                        });
                                    }
                                    appointmentTime.setTime(appointmentTime.getTime() + duration);
                                }
                            }
                        }
                    }
                    freeAppointments.push({
                        date: date,
                        appointments: appointments
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        res.json(freeAppointments);
    } catch (error) {
        res.status(500).json({ error: 'Error al generar los turnos libres.' });
    }
});

router.post('/appointments', [AuthMiddleware.verifyToken, AuthMiddleware.isPaciente], async (req: Request, res: Response) => {
    try {
        const { doctorId, date, startTime, endTime, patologia } = req.body;

        // Validate the input
        if (!doctorId || !date || !startTime || !endTime) {
            return res.status(400).json({ error: 'Datos invalidos de entrada' });
        }
        // let now = new Date(date);
        const startOfWeek = new Date(date.split('-')[2], date.split('-')[1], date.split('-')[0]);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday (assuming Sunday is 0)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 5); // Friday

        const existingAppointmentsCount = await Turno.countDocuments({
            usuarioId: req.userId,
            date: {
                $gte: startOfWeek
                    .toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    })
                    .replace(/[/]/g, '-'),
                $lte: endOfWeek
                    .toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    })
                    .replace(/[/]/g, '-')
            }
        });

        if (existingAppointmentsCount >= 2) {
            return res.status(409).json({ error: 'El usuario ya tiene mas de 2 turnos en la semana en que esta solicitando el turno.' });
        }

        // Check if the appointment already exists
        const existingAppointment = await Turno.findOne({
            doctorId: doctorId,
            date: date,
            startTime: startTime,
            endTime: endTime
        });

        if (existingAppointment) {
            return res.status(409).json({ error: 'El turno solicitado ya esta tomado.' });
        }

        // Check if the doctor is available at the specified date and time
        const doctor = await Usuario.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found.' });
        }

        const appointmentStartTime = new Date(date.split('-')[2], date.split('-')[1], date.split('-')[0] - 1);
        appointmentStartTime.setHours(startTime.split(':')[0]);
        appointmentStartTime.setMinutes(startTime.split(':')[1]);
        const appointmentEndTime = new Date(date.split('-')[2], date.split('-')[1], date.split('-')[0] - 1);
        appointmentEndTime.setHours(endTime.split(':')[0]);
        appointmentEndTime.setMinutes(endTime.split(':')[1]);

        // Check if the appointment start time and end time fall within the doctor's available working hours
        let workingDay;
        if (doctor.workingDays) {
            workingDay = doctor.workingDays.find((day) => day.dayOfWeek === appointmentStartTime.getDay() - 1);
        }

        if (!workingDay) {
            return res.status(400).json({ error: 'Dias del doctor invalido.' });
        }

        const workingStartTime = new Date(date.split('-')[2], date.split('-')[1], date.split('-')[0] - 1);
        workingStartTime.setHours(Number(workingDay.startTime.split(':')[0]));
        workingStartTime.setMinutes(Number(workingDay.startTime.split(':')[1]));
        const workingEndTime = new Date(date.split('-')[2], date.split('-')[1], date.split('-')[0] - 1);
        workingStartTime.setHours(Number(workingDay.endTime.split(':')[0]));
        workingStartTime.setMinutes(Number(workingDay.endTime.split(':')[1]));

        if (appointmentStartTime < workingStartTime || appointmentEndTime > workingEndTime) {
            return res.status(400).json({ error: 'Horarios del doctor invalidos.' });
        }

        // Create the new appointment
        const appointment = new Turno({
            doctorId: doctorId,
            usuarioId: req.userId,
            date: date,
            startTime: startTime,
            endTime: endTime,
            patologia: patologia
        });

        // Save the appointment
        await appointment.save();

        res.json(appointment);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error al crear un turno.' });
    }
});

router.delete('/appointments', [AuthMiddleware.verifyToken, AuthMiddleware.isPaciente], async (req: Request, res: Response) => {
    try {
        const { turnoId } = req.body;

        // Validate the input
        if (!turnoId) {
            return res.status(400).json({ error: 'Datos invalidos de entrada' });
        }

        // Check if the appointment already exists
        const existingAppointment = await Turno.findById(turnoId);

        if (!existingAppointment) {
            return res.status(409).json({ error: 'El turno solicitado no existe.' });
        }

        // Save the appointment
        await existingAppointment.deleteOne();

        res.json({ msg: 'El turno fue cancelado con exito' });
    } catch (error) {
        res.status(500).json({ error: 'Error al cancelar un turno.' });
    }
});

router.get('/appointments/export', [AuthMiddleware.verifyToken, AuthMiddleware.isAdmin], async (req: Request, res: Response) => {
    try {
        const { month, year } = req.body;

        // Get the start and end dates for the specified month
        const startDate = new Date(Number(year), Number(month) - 1, 1);
        const endDate = new Date(Number(year), Number(month), 0);
        endDate.setHours(23, 59, 59, 999);

        // Fetch the appointments for the specified month
        const appointments = await Turno.find({
            date: {
                $gte: startDate
                    .toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    })
                    .replace(/[/]/g, '-'),
                $lte: endDate
                    .toLocaleString('es-AR', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    })
                    .replace(/[/]/g, '-')
            }
        })
            .populate('doctorId')
            .populate('usuarioId');

        // Create a new workbook and worksheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Appointments');

        // Set up the column headers
        worksheet.columns = [
            { header: 'Doctor', key: 'doctor', width: 20 },
            { header: 'Paciente', key: 'patient', width: 20 },
            { header: 'Patologia', key: 'patologia', width: 20 },
            { header: 'Fecha', key: 'date', width: 15 },
            { header: 'Hora de inicio', key: 'startTime', width: 15 },
            { header: 'Hora de fin', key: 'endTime', width: 15 }
        ];
        console.log(startDate);
        console.log(endDate);
        // Populate the worksheet with appointment data
        appointments.forEach((appointment) => {
            const { doctorId, usuarioId, date, startTime, endTime, patologia } = appointment as any;
            const doctorName = (doctorId.nombre as any) + ' ' + doctorId.apellido;
            const patientName = usuarioId.nombre + ' ' + usuarioId.apellido;
            console.log(doctorName, patientName);
            worksheet.addRow({ doctor: doctorName, patient: patientName, patologia: patologia, date: date, startTime, endTime });
        });

        // Set the response headers for Excel file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=appointments.xlsx');

        // Write the workbook to the response stream
        await workbook.xlsx.write(res);

        res.end();
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'An error occurred while exporting appointments.' });
    }
});

export default router;
