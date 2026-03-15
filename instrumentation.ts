export async function register() {
  // Eagerly initialize the database and subsystems on server startup
  // instead of waiting for the first API request (reduces cold-start latency).
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureInitialized } = await import('./src/api/init.js');
    await ensureInitialized();
  }
}
