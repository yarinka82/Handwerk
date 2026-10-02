import { setupServer } from './server';

const bootstrap = async () => {
  setupServer();
  // createDirIfNotExists(TEMP_UPLOAD_DIR);
  // createDirIfNotExists(UPLOAD_DIR);
};

bootstrap();
