import mongoose, { Document, Schema } from 'mongoose';

export interface IUsuario {
    dni: number;
    nombre: string;
    apellido: string;
    contrasenia: string;
    rol: string;
    workingDays?: Array<IWorkingDays>;
}

export interface IWorkingDays {
    dayOfWeek: Number;
    startTime: string;
    endTime: string;
}

export interface IUsuarioModel extends IUsuario, Document {}

const UsuarioSchema: Schema = new Schema({
    dni: { type: Number, require: true },
    nombre: { type: String, require: true },
    apellido: { type: String, require: true },
    contrasenia: { type: String, require: true },
    rol: { type: String, require: true },
    workingDays: { type: Array<IWorkingDays> }
});

UsuarioSchema.pre('save', function (next) {
    if (this.workingDays && this.workingDays.length === 0) {
        this.workingDays = undefined;
    }
    next();
});

export default mongoose.model<IUsuarioModel>('Usuario', UsuarioSchema);
