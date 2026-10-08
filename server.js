import express from 'express';
import { createClient } from 'redis'
import dotenv from 'dotenv'
import crypto from 'crypto'


dotenv.config();
const app = express();
app.use(express.json())
app.use(express.static('public'));
const client = createClient();

app.use(async (req, res, next) => {
  const ip = req.ip
  const key = `rate:${ip}`
  const now = Date.now()
  const window = 60000
  await client.zRemRangeByScore(key, 0, now - window)
  const count = await client.zCard(key)

  if (count >= 5) return res.status(429).json({ message: 'Too many requests' })
  await client.zAdd(key, {
    score: now,
    value: `${now}-${crypto.randomBytes(4).toString('hex')}`
  })
  await client.expire(key, 60);
  next()
})


client.on('error', err => console.log('Redis Client Error', err));

await client.connect();


app.post('/url/shortening', async (req, res) => {
  const body = req.body
  const longUrl = body.longUrl
  const time = body.time
  if (!longUrl || !Number.isInteger(time) || time <= 0) {
    return res.status(400).json({
      message: "Invalid input"
    });
  }
  const id = crypto.randomBytes(4).toString('hex');


  await client.set(`url:${id}`, longUrl, { expiration: { type: 'EX', value: time } });

  res.json({ 'url': `${process.env.URL}${id}` })

})
app.get('/:id', async (req, res) => {
  const id = req.params.id
  const value = await client.get(`url:${id}`);
  console.log(value);
  if (!value) return res.status(404).json({ 'message': 'url not found' })
  res.redirect(value)
})


app.listen(process.env.PORT, () => {
  console.log(`Server is running on ${process.env.URL}`);
});