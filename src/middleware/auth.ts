import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import UsuarioService from '../services/Usuario';
import { config } from '../config/config';

declare module 'express-serve-static-core' {
    interface Request {
        userId?: string;
    }
}

export default class AuthMiddleware {
    static dataService: UsuarioService;

    constructor(usuarioService: UsuarioService) {
        AuthMiddleware.dataService = usuarioService;
    }

    static async verifyToken(req: Request, res: Response, next: NextFunction) {
        try {
            const token = req.headers.authorization;
            if (!token) return res.status(403).json({ error: 'No se envio un token' });
            const payload = jwt.verify(token, config.auth.jwtSecret as string) as { id: string };
            const usuario = await AuthMiddleware.dataService.ObtenerUsuario({ _id: payload.id });
            if (!usuario) return res.status(403).json({ error: 'El usuario no existe' });
            req.userId = payload.id;
            return next();
        } catch (error) {
            console.log(error);
            return res.status(401).json({ error: 'No autorizado' });
        }
    }

    static async isAdmin(req: Request, res: Response, next: NextFunction) {
        const usuario = await AuthMiddleware.dataService.ObtenerUsuario({ _id: req.userId || '' });
        if (usuario.rol == 'admin') {
            return next();
        }
        return res.status(403).json({ error: 'El usuario no tiene permiso para realizar la accion deseada' });
    }

    static async isPaciente(req: Request, res: Response, next: NextFunction) {
        const usuario = await AuthMiddleware.dataService.ObtenerUsuario({ _id: req.userId || '' });
        if (usuario.rol == 'paciente') {
            return next();
        }
        return res.status(403).json({ error: 'El usuario no tiene permiso para realizar la accion deseada' });
    }

    static async isTerapista(req: Request, res: Response, next: NextFunction) {
        const usuario = await AuthMiddleware.dataService.ObtenerUsuario({ _id: req.userId || '' });
        if (usuario.rol == 'terapista') {
            return next();
        }
        return res.status(403).json({ error: 'El usuario no tiene permiso para realizar la accion deseada' });
    }
}
