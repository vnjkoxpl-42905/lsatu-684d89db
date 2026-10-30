import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for ES Module compatibility with __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the 'dist' directory (Vite's default build output)
app.use(express.static(path.join(__dirname, 'dist')));

// For any other route, serve the index.html from the 'dist' directory.
// This is necessary for client-side routing in React applications.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});