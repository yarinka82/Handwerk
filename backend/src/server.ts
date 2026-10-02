import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import cookieParser from 'cookie-parser';
import { configHandwerk } from './configHandwerk';
import router from './router';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';

export const setupServer = () => {
  const app = express();

  app.use(cors());

  const pino = pinoHttp({
    transport: {
      target: 'pino-pretty',
    },
  });

  app.use(pino);

  app.use(express.urlencoded({ extended: true }));

  app.use(cookieParser());

  app.use(express.json());

  app.use(router);

  app.use(notFoundHandler);

  app.use(errorHandler);

  app.listen(configHandwerk.port, () => {
    console.log(`Server is running on port ${configHandwerk.port}`);
  });
};
