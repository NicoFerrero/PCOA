import { IRol } from '../models/IRol';
import { IUsuario, IUsuarioModel, IWorkingDays } from '../models/Usuario';
import IDataService from './IData';
import AuthService from './auth';

export default class UsuarioService {
    dataService: IDataService;
    authService: AuthService;

    constructor(usuarioService: IDataService, authService: AuthService) {
        this.dataService = usuarioService;
        this.authService = authService;
    }

    async crearUsuario(data: IUsuario): Promise<IUsuarioModel | null> {
        try {
            const user = await this.dataService.create<IUsuarioModel>('Usuario', data as IUsuarioModel);
            return user;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    async obtenerUsuarios(): Promise<IUsuarioModel[]> {
        const users = await this.dataService.read<IUsuarioModel>('Usuario');
        return users;
    }

    async ObtenerUsuario(query: {}): Promise<IUsuarioModel> {
        const user = await this.dataService.read<IUsuarioModel>('Usuario', query);
        return user[0];
    }

    async ActualizarUsuario(id: string, data: IUsuario): Promise<IUsuarioModel | null> {
        const updatedUser = await this.dataService.update<IUsuarioModel>('Usuario', id, data as IUsuarioModel);
        return updatedUser;
    }

    async borrarUsuario(id: string): Promise<void> {
        await this.dataService.delete('Usuario', id);
    }

    async iniciarSesion(dni: number, contrasenia: string): Promise<{ token: string; error: string }> {
        try {
            const usuario = await this.ObtenerUsuario({ dni });
            if (!usuario) return { token: '', error: 'Las credenciales no son validas' };
            const pass = await this.authService.comparePasswords(contrasenia, usuario.contrasenia);
            if (!pass) return { token: '', error: 'Las credenciales no son validas' };
            const token = this.authService.createToken(usuario._id);
            return { token, error: '' };
        } catch (e) {
            return { token: '', error: 'Ocurrio un error durante el inicio de sesion' };
        }
    }

    async altaUsuario(nombre: string, apellido: string, dni: number, contrasenia: string, rol: string, workingDays?: Array<IWorkingDays>): Promise<{ usuario: IUsuarioModel | null; error: string }> {
        try {
            const usuarioExistente = await this.ObtenerUsuario({ dni });
            if (usuarioExistente) {
                return { usuario: null, error: 'Ya existe un usuario creado con ese dni.' };
            }
            const constraseniaSegura = await this.authService.encryptPassword(contrasenia);
            const usuario = { nombre, apellido, dni, contrasenia: constraseniaSegura, rol, workingDays };
            const usuarioCreado = await this.crearUsuario(usuario);
            return { usuario: usuarioCreado, error: '' };
        } catch (e) {
            return { usuario: null, error: 'El usuario no se ah podido crear' };
        }
    }
}
