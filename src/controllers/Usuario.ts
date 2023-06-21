import { Request, Response } from 'express';
import UsuarioService from '../services/Usuario';

export default abstract class UsuarioController {
    usuarioService: UsuarioService;
    constructor(usuarioService: UsuarioService) {
        this.usuarioService = usuarioService;
    }

    async iniciarSesion(req: Request, res: Response) {
        const { dni, contrasenia } = req.body;
        const { token, error } = await this.usuarioService.iniciarSesion(dni, contrasenia);
        if (error) return res.status(404).json({ token: '', error });
        return res.status(200).json({ token: token, error: '' });
    }
}
