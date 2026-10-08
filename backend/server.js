import dotenv from 'dotenv';

// Load environment variables before anything reads them
dotenv.config({ quiet: true });

const { default: connectDB } = await import('./config/db.js');
const { default: app } = await import('./app.js');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be set in .env and be at least 32 characters long.');
  process.exit(1);
}

// Connect to MongoDB before accepting requests
await connectDB();

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});
