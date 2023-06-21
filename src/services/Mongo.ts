import mongoose, { FilterQuery } from 'mongoose';
import IDataService from './IData';

export default class MongoService implements IDataService {
    async create<T>(modelName: string, data: T): Promise<T> {
        const model = mongoose.model<T>(modelName);
        const instance = new model(data);
        await instance.save();
        return instance;
    }

    async read<T>(modelName: string, query: {}): Promise<T[]> {
        const model = mongoose.model<T>(modelName);
        const result = await model.find(query);
        return result;
    }

    async update<T>(modelName: string, id: string, data: T): Promise<T | null> {
        const model = mongoose.model<T>(modelName);
        const result = await model.findByIdAndUpdate(id, data as FilterQuery<T>, { new: true });
        return result;
    }

    async delete(modelName: string, id: string): Promise<void> {
        const model = mongoose.model(modelName);
        await model.findByIdAndDelete(id);
    }
}
