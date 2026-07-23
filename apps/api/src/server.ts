import express from 'express';
import { env } from './config/env';

const app = express();
app.disable('x-powered-by');

app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));

app.listen(env.PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${env.PORT}`);
});

