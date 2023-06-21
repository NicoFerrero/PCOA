import { Request, Response } from 'express';
import UsuarioController from './Usuario';
import UsuarioService from '../services/Usuario';
import { IRol } from '../models/IRol';

export default class PacienteController extends UsuarioController {
    constructor(usuarioService: UsuarioService) {
        super(usuarioService);
    }

    async crearPaciente(req: Request, res: Response) {
        const { nombre, apellido, dni, contrasenia } = req.body;
        const { usuario, error } = await this.usuarioService.altaUsuario(nombre, apellido, dni, contrasenia, IRol.paciente);
        if (error) return res.status(404).json({ usuario: null, error });
        return res.status(201).json({ usuario: usuario, error: '' });
    }
}
