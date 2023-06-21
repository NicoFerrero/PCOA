import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export default class AuthService {
    async encryptPassword(contrasenia: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(contrasenia, salt);
    }

    async comparePasswords(contrasenia: string, contraseniaRecibida: string): Promise<boolean> {
        return await bcrypt.compare(contrasenia, contraseniaRecibida);
    }

    createToken(id: number): string {
        return jwt.sign({ id: id }, config.auth.jwtSecret as string, {
            expiresIn: 84600 //24hs,
        });
    }
}
