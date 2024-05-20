require('dotenv').config()
const express = require('express');
const cors = require('cors')
const router = require('./routers/index');

const app = express();
app.use(cors())
app.use(express.json())
app.use("/api", router)
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});