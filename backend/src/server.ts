import app from './app';
import { config } from './config/env';

const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});


