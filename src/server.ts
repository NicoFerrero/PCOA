import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { config } from './config/config';
import http from 'http';
//Routes
import authRoutes from './routes/auth';
import turnoRoutes from './routes/turno';
//Models
require('./models/Usuario');
require('./models/Turno');

const app = express();

mongoose
    .connect(config.mongo.url)
    .then(() => {
        console.log('Connected');
    })
    .catch((error) => {
        console.log('Error connecting to database: ', error);
    });

const startSever = () => {
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

        if (req.method == 'OPTIONS') {
            res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
            return res.status(200).json({});
        }

        next();
    });

    app.use('/api/v1', authRoutes);
    app.use('/api/v1', turnoRoutes);

    /** Healthcheck */
    app.get('/api/v1/ping', (req, res, next) => res.status(200).json({ hello: 'pong' }));

    /** Error handling */
    app.use((req, res, next) => {
        const error = new Error('Not found');

        console.error(error);

        res.status(404).json({
            message: error.message
        });
    });

    http.createServer(app).listen(config.server.port, () => console.info(`Server is running on port ${config.server.port}`));
};

startSever();
