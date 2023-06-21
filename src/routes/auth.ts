import { Request, Response, Router } from 'express';
import UsuarioService from '../services/Usuario';
import PacienteController from '../controllers/Paciente';
import MongoService from '../services/Mongo';
import AuthService from '../services/auth';
import AuthMiddleware from '../middleware/auth';
import AdminController from '../controllers/Admin';

//Inicializacion de servicios
const mongoService = new MongoService();
const authService = new AuthService();
const usuarioService = new UsuarioService(mongoService, authService);
//Incializacion de controladores
const pacienteController = new PacienteController(usuarioService);
const adminController = new AdminController(usuarioService);
//Inicializacion de middleware
new AuthMiddleware(usuarioService);

const router = Router();

router.post('/iniciar-sesion', (req: Request, res: Response) => pacienteController.iniciarSesion(req, res));
router.post('/alta-paciente', (req: Request, res: Response) => pacienteController.crearPaciente(req, res));
router.post('/alta-terapista', [AuthMiddleware.verifyToken, AuthMiddleware.isAdmin], (req: Request, res: Response) => adminController.crearTerapista(req, res));
router.post('/alta-admin', [AuthMiddleware.verifyToken, AuthMiddleware.isAdmin], (req: Request, res: Response) => adminController.crearAdmin(req, res));

export default router;
