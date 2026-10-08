import express from 'express';
import { createClient } from 'redis'
import dotenv from 'dotenv'

dotenv.config();
const app = express();
app.use(express.json())
app.use(express.static('public'));



const client = createClient();

client.on('error', err => console.log('Redis Client Error', err));



app.get('/', (req, res) => {
  res.sendFile("index.html");
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000/');
});