import mongoose, { Document, Schema } from 'mongoose';

export interface ITurno {
    doctorId: String;
    usuarioId: String;
    date: String;
    startTime: String;
    endTime: String;
    patologia: String;
}

export interface ITurnoModel extends ITurno, Document {}

const TurnoSchema: Schema = new Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', require: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', require: true },
    date: { type: String, require: true },
    startTime: { type: String, require: true },
    endTime: { type: String, require: true },
    patologia: { type: String, require: true }
});

export default mongoose.model<ITurnoModel>('Turno', TurnoSchema);
