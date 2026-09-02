require('dotenv').config();

const pool = require('./config/db');

(async () => {
  try {
    const result = await pool.query('SELECT NOW()');

    console.log('✅ Conectado a Supabase');
    console.log(result.rows[0]);

  } catch (error) {
    console.error('❌ Error conexión:', error);
  }
})();
